import { Component, computed, inject, OnInit } from '@angular/core';
import { InvoicesService } from '../../../services/invoices-services/invoices.service';
import Swal from 'sweetalert2';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DrawerService } from '../../../services/drawer-service/drawer.service';
import { DrawerContents } from '../../../interface/drawer-content.enum';
import { formatNewDate } from '../../../helpers/dateFormatters';

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

  public isDrawerSetToUpd = computed(() => this.drawerParams.setToUpdate())

  public options: Options = {patients: [], doctors: [], services: [], pMethods: []}
  public selectedServices: any[] = []
  public invoiceForm: FormGroup = this.fb.group({
    patient      : ['', [Validators.required]],
    doctor       : ['', [Validators.required]],
    service      : this.fb.array([], [Validators.required]),
    date         : ['', [Validators.required]],
    pMethod      : ['', [Validators.required]],
    amount       : [{value: '', disabled: true}],
    description  : [{value: '', disabled: true}],
  })

  ngOnInit(): void {
    console.log('is set to upd: ', this.isDrawerSetToUpd())
    this.getInvoiceData()
    this.invoiceForm.get('date')!.setValue(formatNewDate(new Date()))
  }

  get serviceArray(): FormArray {
    return this.invoiceForm.get('service') as FormArray;
  }

  public getInvoiceData() {
    this.invoiceService.getDataForInvoice()
      .subscribe({
        next: ( resp ) => {
          this.options.doctors = resp.data.doctors
          this.options.patients = resp.data.patients
          this.options.services = resp.data.services
          this.options.pMethods = resp.data.paymentMethods
        },
        error: ( message ) => {
          Swal.fire('Error', message, 'error')
        }
      })
  }

  public handleChange(event: any) {
    const name = event.target.name
    const value = event.target.value
    const selectedOption: any[] = this.options[name as keyof typeof Option]
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
  }

  public onHandleSubmit() {
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
                this.onHandleCancel()
              })
          }
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
      this.serviceArray.push(this.fb.control(item.id, [Validators.required]))
    })
    this.invoiceForm.get('amount')?.setValue(totalAmount.toFixed(2))
    this.invoiceForm.get('description')?.setValue(concatDescriptions)
  }
}
