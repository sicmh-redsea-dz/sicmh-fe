import { Component, computed, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { VisitsService } from '../../../services/visits-service/visits.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormVisit } from '../../../interface/visits-response.interface';
import { Stock } from '../../../interface/visits-service.interface'
import Swal from 'sweetalert2';
import { map } from 'rxjs';
import { formatNewDate, formatIncomingData } from '../../../helpers/dateFormatters';

@Component({
  selector: 'app-visits-form-page-v2',
  templateUrl: './visits-form-page-v2.component.html',
  styleUrl: './visits-form-page-v2.component.css'
})
export class VisitsFormPageV2Component {
  public title = ''
  public caller = ''
  public actionButtonText = ''
  private router = inject( Router )
  private fb = inject( FormBuilder )
  public visitsService = inject( VisitsService )
  private activateRoute = inject( ActivatedRoute )

  public bmiDisabled = true;
  public selectedStockItems: Stock[] = []
  public selectedVisit = computed(() => this.visitsService.selectedVisit())
  public listOfDoctors = computed(() => this.visitsService.listOfDoctors())
  public listOfPatients = computed(() => this.visitsService.listOfPatients())
  public listOfStockItems = computed(() => this.visitsService.listOfStockItems())

  public visitForm: FormGroup = this.fb.group({
    patient     : [this.caller !== 'nv' ? this.selectedVisit()?.patientId : '', [Validators.required]],
    doctor      : [this.caller !== 'nv' ? this.selectedVisit()?.staffId : '', [Validators.required]],
    date        : [this.caller !== 'nv' ? '' : '', [Validators.required]],
    notes       : [this.caller !== 'nv' ? this.selectedVisit()?.notes : '', []],
    pressure    : [this.caller !== 'nv' ? this.selectedVisit()?.bloodPressure : '', [Validators.required]],
    oxygenation : [this.caller !== 'nv' ? this.selectedVisit()?.oxygenSaturation : '', [Validators.required]],
    temperature : [this.caller !== 'nv' ? this.selectedVisit()?.temperature : '', [Validators.required]],
    glucometry  : [this.caller !== 'nv' ? this.selectedVisit()?.glucoseLevel : '', [Validators.required]],
    weight      : [this.caller !== 'nv' ? this.selectedVisit()?.weight : '', [Validators.required]],
    height      : [this.caller !== 'nv' ? this.selectedVisit()?.height : '', [Validators.required]],
    stockItems  : this.fb.array([],[Validators.required])
  })

  ngOnInit(): void {
    this.activateRoute.url
      .pipe(
        map((urlSegment) => urlSegment),
      ).subscribe( segments => {
        let urlSegment = segments[0].path === 'new-visit' ? true : false
        if( urlSegment ) {
          this.caller = 'nv'
          this.title = 'Registro de visitas'
          this.actionButtonText = 'Guardar'
          this.visitForm.reset();
          this.visitForm.get('date')?.setValue(formatNewDate(new Date()))
        } else {
          this.title = 'Editar visita'
          this.actionButtonText = 'Editar'
          this.visitForm.get('date')!.setValue(formatIncomingData(this.selectedVisit()?.lastVisitDate!))
        }
      })
  }

  get stockItemsArray(): FormArray {
    return this.visitForm.get('stockItems') as FormArray
  }

  public get idTag() : string {
    return `# ${this.selectedVisit()?.id}`
  }

  public onHandleSubmit() {
    const visit = this.visitForm.value
    this.caller === 'nv'
    ? this.handleCreateVisit( visit )
    : this.handleEditVisit( visit )
  }

  public handleCreateVisit(visit: FormVisit) {
    this.visitsService.createVisit( visit )
      .subscribe({
        next: ( visit ) => {
          if( visit ) {
            Swal.fire('Success', 'New visit added!', 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/visits')
              })
          }
        },
        error: ( hasError ) => {
          if ( !hasError ) {

            Swal.fire('Error', 'Error al generar visita nueva', 'error')
          }
        }
      })
  }

  public handleEditVisit( visit: FormVisit ) {
    visit.date =  visit.date.split('T')[0]
    this.visitsService.editVisit(this.selectedVisit()?.id!, visit )
      .subscribe({
        next: ( visit ) => {
          if( visit ) {
            Swal.fire('Success', 'New visit edited!', 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/visits')
              })
          }
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public updateValue(event: Event, change: number) {
    event.preventDefault()
    const caller = (event.target as HTMLButtonElement).getAttribute('data-caller')

    if( caller && this.visitForm.contains( caller ) ) {
      const currentVal = parseInt(this.visitForm.get(caller)?.value || '0')
      const valueToSet = currentVal + change
      if(valueToSet > 0 && valueToSet < 100) this.visitForm.get(caller)?.setValue(valueToSet.toString())
    }
  }

  public incrementQuantity(index: number) {
    const item = this.selectedStockItems[index];
    if (item.currentQuantity < item.productQuantity) {
      item.currentQuantity += 1
      this.loadDataOfStockArray()
    }
  }

  public decrementQuantity(index: number) {
    const item = this.selectedStockItems[index];
    if (item.currentQuantity > 1) {
      item.currentQuantity -= 1
      this.loadDataOfStockArray()
    } 
  }

  public handleChange(event: any) {
    const { target } = event
    const value = target.value
    if (this.selectedStockItems.length === 0){
      const existingItem = this.listOfStockItems()!.find((item: any) => item.id === parseInt(value));
      if( existingItem ) this.selectedStockItems.push({...existingItem, currentQuantity: 1});
    } 
    else {
      const existingItem = this.selectedStockItems.find((item: any) => item.id === parseInt(value));
      if (!existingItem) this.selectedStockItems.push({...this.listOfStockItems()!.find((item: any) => item.id === parseInt(value))!, currentQuantity: 1})
    }
    this.loadDataOfStockArray()
  }

  public removeListItem(id: number, idx: number) {
    this.selectedStockItems = this.selectedStockItems.filter((item) => item.id !== +id)
    this.stockItemsArray.removeAt(idx)
    this.loadDataOfStockArray()
  }

  private loadDataOfStockArray() {
    this.stockItemsArray.clear()
    this.selectedStockItems.forEach((item) => {
      this.stockItemsArray.push(
        this.fb.control(
          {id: item.id, qty: item.currentQuantity}, 
          [Validators.required]
        )
      )
    })
  }

  private calculateBMI(): void {
    const weight = this.visitForm.get('weight')?.value
    const height = this.visitForm.get('height')?.value
    if (weight && height) {
      const heightInMeters = height / 100
      const bmi = weight / (heightInMeters * heightInMeters)
      this.visitForm.get('BMI')?.setValue(bmi.toFixed(2).toString())
      this.bmiDisabled = false
    } else {
      this.visitForm.get('BMI')?.setValue('')
      this.bmiDisabled = true
    }
  }
}
