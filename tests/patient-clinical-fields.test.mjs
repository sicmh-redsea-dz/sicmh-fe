import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
const load = async path => {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}
const { ageInYears } = await load('../src/app/shared/utils/age-in-years.ts')
const { clinicalDateTimeInput, clinicalDatesForApi } = await load('../src/app/dashboard/helpers/visits-form/clinical-dates.ts')
test('age uses completed calendar years, including zero, birthday boundaries and invalid dates', () => {
  const today = new Date(2026, 9, 24, 12)
  assert.equal(ageInYears('2000-10-24', today), 26)
  assert.equal(ageInYears('2000-10-25', today), 25)
  assert.equal(ageInYears('2026-10-24', today), 0)
  assert.equal(ageInYears('2000-10-24T00:00:00.000Z', today), 26)
  for (const value of [null, undefined, '', '2000-02-30', '2027-01-01']) assert.equal(ageInYears(value, today), null)
})
test('surgery dates preserve local calendar time and dates across midnight when reopened and submitted', () => {
  const start = '2026-10-24T23:30'
  const end = '2026-10-25T01:15'
  const original = { surgeryStart: start, surgeryEnd: end, procedure: 'Procedure' }
  const api = clinicalDatesForApi(original)
  assert.equal(clinicalDateTimeInput(api.surgeryStart), start)
  assert.equal(clinicalDateTimeInput(api.surgeryEnd), end)
  assert.equal(new Date(api.surgeryEnd) - new Date(api.surgeryStart), 105 * 60000)
  assert.equal(original.surgeryStart, start)
  assert.equal(api.procedure, 'Procedure')
  assert.equal(clinicalDateTimeInput('invalid'), '')
  assert.equal(clinicalDateTimeInput(), '')
  assert.deepEqual(clinicalDatesForApi({ surgeryStart: '', surgeryEnd: '' }), { surgeryStart: '', surgeryEnd: '' })
})
