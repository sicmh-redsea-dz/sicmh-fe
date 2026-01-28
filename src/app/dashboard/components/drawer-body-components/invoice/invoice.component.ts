import { Component, computed, inject, OnInit } from '@angular/core';
import { InvoicesService } from '../../../services/invoices-services/invoices.service';
import Swal from 'sweetalert2';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DrawerService } from '../../../services/drawer-service/drawer.service';
import { DrawerContents } from '../../../interface/drawer-content.enum';
import { formatIncomingData, formatNewDate } from '../../../../shared/utils/date-formatters';

interface Options {
  patients: any[]
  doctors : any[]
  services: any[]
  pMethods: any[]
}

@Component({
  selector: 'app-drawer-invoice',
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.css'
})
export class InvoiceComponent implements OnInit {
  private fb = inject( FormBuilder )
  private drawerParams = inject( DrawerService )
  private invoiceService = inject( InvoicesService )

  public invoiceIdToUpd = computed(() => this.drawerParams.setInvoiceId())
  public isDrawerSetToUpd = computed(() => this.drawerParams.setToUpdate())
  public drawerTexts = computed(() => this.drawerParams.drawerTexts())

  public selectedServices: any[] = []
  public invoiceForm: FormGroup = this.fb.group({
    patient     : ['', [Validators.required]],
    doctor      : ['', [Validators.required]],
    service     : this.fb.array([], []),
    date        : ['', [Validators.required]],
    pMethod     : ['', [Validators.required]],
    amount      : [{value: '', disabled: true}],
    description : [{value: '', disabled: true}],
  })
  public options: Options = {patients: [], doctors: [], services: [], pMethods: []}

  ngOnInit(): void {
    this.getInvoiceData()
      .then(() => {
        if (!this.isDrawerSetToUpd()) {
          this.invoiceForm.get('date')!.setValue(formatNewDate(new Date()))
        } else {
          this.getPendingInvoice(this.invoiceIdToUpd())
        }
      })
  }

  get serviceArray(): FormArray {
    return this.invoiceForm.get('service') as FormArray;
  }

  public getInvoiceData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.invoiceService.getDataForInvoice().subscribe({
        next: (resp) => {
          this.options.doctors = resp.data.doctors
          this.options.patients = resp.data.patients
          this.options.services = resp.data.services
          this.options.pMethods = resp.data.paymentMethods
          resolve()
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
          reject(message)
        }
      })
    })
  }

  public getPendingInvoice(invoiceId: string) {
    this.invoiceService.getOneInvoice(invoiceId)
      .subscribe({
        next: ({ data }) => {
          this.setDataInForm( data )
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  private setDataInForm(data: Record<string, any>) {
    const { visitType, patientId, doctorId, date, amount } = data
    this.invoiceForm.get('patient')!.setValue( patientId )
    this.invoiceForm.get('doctor')!.setValue( doctorId )
    this.invoiceForm.get('date')!.setValue( formatIncomingData( date ) )
    if( amount > 0 ) {
      this.selectedServices.push({price: amount, desc: 'Material Medico'})
      this.loadMutableData()
    }
    
    if ( visitType ) {
      const updId = visitType === 'Emergencia' ? 2 : 1
      const selectedItem = this.options.services.find( item => item.id === updId )
      
      this.selectedServices.push({description: selectedItem.serviceName, id: selectedItem.id, price: selectedItem.servicePrice, desc: selectedItem.serviceDescription})
      this.loadMutableData()
    }
  }

  public handleChange(event: any) {
    const name = event.target.name
    const value = event.target.value
    const key = name as keyof Options
    const selectedOption: any[] = this.options[key] ?? []
    const selectedItem = selectedOption.find((item) => item.id === parseInt(value))
    if(this.selectedServices.find((item) => item.id === parseInt(value))) return
    this.selectedServices.push({description: selectedItem.serviceName, id: selectedItem.id, price: selectedItem.servicePrice, desc: selectedItem.serviceDescription})
    this.loadMutableData()
  }

  public removeListItem(id: string, idx: number) {
    this.selectedServices = this.selectedServices.filter((item) => item.id !== id)
    this.serviceArray.removeAt(idx)
    this.loadMutableData()
  }

  public onHandleCancel() {
    this.invoiceForm.reset()
    this.drawerParams.isDrawerOpen.set( false )
    this.drawerParams.contentToDisplay.set( DrawerContents.NONE )
    this.drawerParams.setToUpdate.set( false )
    this.drawerParams.setInvoiceId.set( '' )
  }

  public onHandleSubmit() {
    if( this.isDrawerSetToUpd() ) 
      this.completeExistingInvoice()
    else 
      this.saveNewInvoice()
  }
  
  private saveNewInvoice() {
    if(!this.invoiceForm.valid) return
    this.invoiceService.createInvoice({
      ...this.invoiceForm.value,
      amount: this.invoiceForm.get('amount')?.value
    })
      .subscribe({
        next: ( invoice ) => {
          if( invoice ) {
            Swal.fire('Success', 'New invoice added!', 'success')
              .then(() => {
                this.drawerParams.triggerInvoiceRefresh()
                this.onHandleCancel()
              })
          }
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })

  }

  private completeExistingInvoice() {
    if(!this.invoiceForm.valid) return
    this.invoiceService.updateInvoice(this.invoiceIdToUpd(), {...this.invoiceForm.value, amount: this.invoiceForm.get('amount')?.value})
      .subscribe({
        next: ( resp ) => {
          Swal.fire('Success', 'Invoice updated!', 'success')
            .then(() => {
              this.drawerParams.triggerInvoiceRefresh()
              this.onHandleCancel()
            })
          return resp
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  private loadMutableData() {
    let totalAmount: number = 0
    let concatDescriptions: string = ''
    this.serviceArray.clear();
    this.selectedServices.forEach((item, idx) => {
      totalAmount += parseFloat(item.price)
      concatDescriptions += `${idx+1}. ${item.desc}.\n`
      if( item.id ) 
        this.serviceArray.push(this.fb.control(item.id, []))
    })
    this.invoiceForm.get('amount')?.setValue(totalAmount.toFixed(2))
    this.invoiceForm.get('description')?.setValue(concatDescriptions)
  }
}
