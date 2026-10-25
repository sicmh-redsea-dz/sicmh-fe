import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
import '@angular/compiler'
import { createEnvironmentInjector, runInInjectionContext } from '@angular/core'
import { FormBuilder } from '@angular/forms'
import { Subject, of } from 'rxjs'

const token = Symbol('VisitsService')
globalThis.clinicalProfileTestServiceToken = token
const source = readFileSync(new URL('../src/app/dashboard/components/clinical-profile/clinical-profile.component.ts', import.meta.url), 'utf8')
let compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, experimentalDecorators: true,
} }).outputText
compiled = compiled.replace(/import \{ VisitsService \} from '[^']+';/, 'const VisitsService = globalThis.clinicalProfileTestServiceToken;')
compiled = compiled.replace(/from '(@angular\/[^']+)'/g, (_, name) => `from '${import.meta.resolve(name)}'`)
const { ClinicalProfileComponent } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
delete globalThis.clinicalProfileTestServiceToken
const data = () => ({ familyHst: '', backgroundHst: '', pathologicalHst: '', surgicalHst: '', allergies: '', currentMeds: '', allergyStatus: 'unknown' })
const setup = service => {
  const injector = createEnvironmentInjector([{ provide: token, useValue: service }, { provide: FormBuilder, useValue: new FormBuilder() }])
  const component = runInInjectionContext(injector, () => new ClinicalProfileComponent())
  const values = []
  component.reviewChange.subscribe(value => values.push(value))
  return { component, values, dispose() { component.ngOnDestroy(); injector.destroy() } }
}

test('switching patients cancels stale responses and valid edits are saved without mandatory confirmation', () => {
  const a = new Subject(), b = new Subject()
  const state = setup({ getClinicalProfile: id => id === 'a' ? a : b })
  const { component, values } = state
  try {
    component.patientId = 'a'; component.ngOnChanges()
    component.patientId = 'b'; component.ngOnChanges()
    b.next({ version: 2, data: { ...data(), pathologicalHst: 'Patient B' }, conflicts: {}, updatedAt: null })
    assert.equal(component.expanded, false)
    assert.equal(component.reviewed, false)
    assert.equal(values.at(-1), null, 'loading a collapsed profile must not record a review')
    component.confirm()
    assert.equal(values.at(-1).version, 2)
    a.next({ version: 8, data: { ...data(), pathologicalHst: 'Patient A' }, conflicts: {}, updatedAt: null })
    assert.equal(component.form.controls.pathologicalHst.value, 'Patient B')
    component.form.controls.currentMeds.setValue('New medication')
    assert.equal(component.reviewed, true)
    assert.equal(values.at(-1).data.currentMeds, 'New medication')
    component.patientId = ''; component.ngOnChanges()
    assert.equal(component.canReview, false)
  } finally { state.dispose() }
})

test('historical conflicts require review and allergy status stays consistent', () => {
  const state = setup({ getClinicalProfile: () => of({ version: 0, data: data(),
    conflicts: { currentMeds: ['A', 'B'], allergies: ['Penicilina', 'Latex'] }, updatedAt: null }) })
  const { component } = state
  try {
    component.patientId = 'patient'; component.ngOnChanges()
    assert.equal(component.canReview, false)
    component.choose('currentMeds', 'A')
    assert.equal(component.canReview, false)
    component.choose('allergies', 'Penicilina')
    assert.equal(component.form.controls.allergyStatus.value, 'recorded')
    assert.equal(component.canReview, true)
    component.confirm()
    assert.equal(component.reviewed, true)
    component.form.controls.allergyStatus.setValue('none_known')
    component.allergyStatusChanged()
    assert.equal(component.form.controls.allergies.value, '')
    assert.equal(component.reviewed, true)
  } finally { state.dispose() }
})

test('unmodified profiles are optional and only invalid edits block saving', () => {
  const state = setup({ getClinicalProfile: () => of({ version: 1, data: data(), conflicts: {}, updatedAt: null }) })
  const blocked = []
  state.component.saveBlocked.subscribe(value => blocked.push(value))
  try {
    const component = state.component
    component.patientId = 'patient'; component.ngOnChanges()
    assert.equal(blocked.at(-1), false)
    assert.equal(state.values.at(-1), null)
    component.form.controls.allergyStatus.setValue('recorded')
    assert.equal(blocked.at(-1), true)
    assert.equal(state.values.at(-1), null)
    component.form.controls.allergies.setValue('Penicilina')
    assert.equal(blocked.at(-1), false)
    assert.equal(state.values.at(-1).data.allergies, 'Penicilina')
    component.patientId = ''; component.ngOnChanges()
    assert.equal(blocked.at(-1), false)
    assert.equal(state.values.at(-1), null)
  } finally { state.dispose() }
})
