import { CommonModule } from '@angular/common'
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, inject } from '@angular/core'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { Subscription } from 'rxjs'
import { VisitsService } from '../../services/visits-service/visits.service'

export interface ClinicalProfileData {
  familyHst: string; backgroundHst: string; pathologicalHst: string; surgicalHst: string
  allergies: string; currentMeds: string; allergyStatus: 'unknown' | 'none_known' | 'recorded'
}
export interface ClinicalProfileReview { version: number; data: ClinicalProfileData }
export interface ClinicalProfileResponse extends ClinicalProfileReview {
  conflicts: Partial<Record<keyof ClinicalProfileData, string[]>>
  updatedAt: string | null
}

@Component({
  selector: 'app-clinical-profile', standalone: true, imports: [CommonModule, ReactiveFormsModule],
  template: `
    <details class="profile" [open]="expanded" (toggle)="expanded = $any($event.target).open">
      <summary><strong>Ficha clínica del paciente</strong><span>Antecedentes, alergias y medicamentos · {{ expanded ? 'Ocultar' : 'Ver ficha' }}</span></summary>
      <div class="profile-content">
      <p *ngIf="!patientId">Seleccione un paciente para consultar sus antecedentes.</p>
      <p *ngIf="loading" role="status">Cargando ficha clínica…</p>
      <p *ngIf="error" role="alert">{{ error }} <button type="button" (click)="load()">Reintentar</button></p>
      <ng-container *ngIf="loaded && !loading && !error">
        <p *ngIf="version === 0">Ficha inicial pendiente de revisión. Los datos propuestos proceden de atenciones anteriores.</p>
        <p *ngIf="updatedAt">Última actualización: {{ updatedAt | date:'dd/MM/yyyy HH:mm' }}</p>
        <div [formGroup]="form">
          <div class="field" *ngFor="let field of fields">
            <label [for]="'profile-' + field.key">{{ field.label }}</label>
            <p *ngIf="!editing">{{ form.controls[field.key].value || 'Sin información registrada' }}</p>
            <textarea *ngIf="editing" [id]="'profile-' + field.key" [formControlName]="field.key" maxlength="20000"></textarea>
            <div *ngIf="editing && conflicts[field.key]?.length" class="conflict">
              <span>Las atenciones anteriores contienen datos diferentes. Revise y elija o escriba el dato vigente:</span>
              <button type="button" *ngFor="let value of conflicts[field.key]" (click)="choose(field.key, value)">{{ value }}</button>
            </div>
          </div>
          <label for="profile-allergy-status">Estado de alergias</label>
          <select *ngIf="editing" id="profile-allergy-status" formControlName="allergyStatus" (change)="allergyStatusChanged()">
            <option value="unknown">Información aún no recabada</option>
            <option value="none_known">Sin alergias conocidas</option>
            <option value="recorded">Alergias registradas</option>
          </select>
          <p *ngIf="!editing">{{ allergyLabel }}</p>
          <div *ngIf="form.controls.allergyStatus.value === 'recorded'">
            <label for="profile-allergies">Alergias y reacciones conocidas</label>
            <textarea *ngIf="editing" id="profile-allergies" formControlName="allergies" maxlength="20000"></textarea>
            <p *ngIf="!editing">{{ form.controls.allergies.value }}</p>
          </div>
          <div *ngIf="editing && conflicts.allergies?.length" class="conflict">
            <span>Alergias diferentes en atenciones anteriores. Confirme el estado y la información vigente:</span>
            <button type="button" *ngFor="let value of conflicts.allergies" (click)="choose('allergies', value)">{{ value }}</button>
          </div>
        </div>
        <button type="button" (click)="editing = !editing">{{ editing ? 'Ver resumen' : 'Actualizar ficha' }}</button>
        <button type="button" (click)="load()">Volver a cargar ficha</button>
        <button type="button" *ngIf="!reviewed" [disabled]="!canReview" (click)="confirm()">Registrar revisión de la ficha (opcional)</button>
        <p *ngIf="reviewed" role="status">{{ modified ? 'Los cambios se guardarán junto con la consulta.' : 'La revisión se registrará al guardar la consulta.' }}</p>
        <p *ngIf="modified && !canReview" role="alert">Complete las alergias registradas y resuelva los datos históricos en conflicto para guardar los cambios.</p>
      </ng-container>
      </div>
    </details>`,
  styles: [`.profile{border:1px solid #cbd5e1;border-radius:12px;margin:20px 0;background:#f8fafc}summary{padding:16px 20px;cursor:pointer}summary:focus-visible{outline:2px solid #2563eb;outline-offset:2px}summary span{display:block;margin:4px 0 0 18px;font-size:.85rem;color:#475569}.profile-content{padding:0 20px 20px}.field{margin:12px 0}label{display:block;font-weight:600}textarea,select{width:100%;padding:10px;box-sizing:border-box}textarea{min-height:65px}.conflict{padding:10px;background:#fff7ed}.conflict button{display:block;margin:6px 0;white-space:pre-wrap;text-align:left}p{white-space:pre-wrap}`],
})
export class ClinicalProfileComponent implements OnChanges, OnDestroy {
  @Input() patientId = ''
  @Output() reviewChange = new EventEmitter<ClinicalProfileReview | null>()
  @Output() saveBlocked = new EventEmitter<boolean>()
  private service = inject(VisitsService)
  private fb = inject(FormBuilder)
  private request?: Subscription
  private changes?: Subscription
  public form = this.fb.nonNullable.group({ familyHst: '', backgroundHst: '', pathologicalHst: '', surgicalHst: '', allergies: '', currentMeds: '', allergyStatus: 'unknown' })
  public fields = [{ key: 'pathologicalHst', label: 'Antecedentes patológicos' }, { key: 'familyHst', label: 'Antecedentes familiares' },
    { key: 'surgicalHst', label: 'Antecedentes quirúrgicos' }, { key: 'backgroundHst', label: 'Hábitos' }, { key: 'currentMeds', label: 'Medicamentos habituales' }] as const
  public conflicts: ClinicalProfileResponse['conflicts'] = {}
  public version = 0
  public updatedAt: string | null = null
  public editing = false
  public loading = false
  public loaded = false
  public reviewed = false
  public expanded = false
  public modified = false
  public error = ''
  constructor() { this.changes = this.form.valueChanges.subscribe(() => {
    this.modified = true
    this.reviewed = this.canReview
    this.emitReview()
    this.saveBlocked.emit(!this.canReview)
  }) }
  ngOnChanges() { this.load() }
  ngOnDestroy() { this.request?.unsubscribe(); this.changes?.unsubscribe() }
  load() {
    this.request?.unsubscribe()
    this.loaded = false; this.reviewed = false; this.modified = false; this.expanded = false
    this.error = ''; this.reviewChange.emit(null); this.saveBlocked.emit(false)
    this.loading = !!this.patientId
    if (!this.patientId) return
    this.request = this.service.getClinicalProfile(this.patientId).subscribe({
      next: profile => {
        this.form.reset(profile.data, { emitEvent: false })
        this.version = profile.version; this.conflicts = profile.conflicts; this.updatedAt = profile.updatedAt
        this.editing = profile.version === 0; this.loaded = true; this.loading = false
      }, error: error => { this.error = String(error); this.loading = false },
    })
  }
  choose(key: keyof ClinicalProfileData, value: string) {
    this.form.controls[key].setValue(value)
    if (key === 'allergies') this.form.controls.allergyStatus.setValue('recorded')
  }
  allergyStatusChanged() {
    if (this.form.controls.allergyStatus.value !== 'recorded') this.form.controls.allergies.setValue('')
  }
  get allergyLabel() { return ({ unknown: 'Información aún no recabada', none_known: 'Sin alergias conocidas', recorded: 'Alergias registradas' } as Record<string, string>)[this.form.controls.allergyStatus.value] }
  get canReview() {
    const data = this.form.getRawValue()
    return this.loaded && !this.error && ((data.allergyStatus === 'recorded') === !!data.allergies.trim())
      && Object.keys(this.conflicts).every(key => key === 'allergies' ? data.allergyStatus !== 'unknown' : !!data[key as keyof ClinicalProfileData].trim())
  }
  confirm() {
    this.reviewed = this.canReview
    this.emitReview()
  }
  private emitReview() {
    this.reviewChange.emit(this.reviewed ? { version: this.version, data: this.form.getRawValue() as ClinicalProfileData } : null)
  }
}
