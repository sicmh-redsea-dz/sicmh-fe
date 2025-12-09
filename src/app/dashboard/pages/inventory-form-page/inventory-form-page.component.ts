import { Component, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientsService } from '../../services/patients-service/patients.service';
import Swal from 'sweetalert2';
import { InvServiceService } from '../../services/inventory-service/inv-service.service';

@Component({
  selector: 'app-inventory-form-page',
  templateUrl: './inventory-form-page.component.html',
  styleUrl: './inventory-form-page.component.css'
})
export class InventoryFormPageComponent {
public title = ''
  public caller = ''
  public actionButtonText = ''
  private fb = inject( FormBuilder )
  private router = inject( Router )
  private activeRoute = inject( ActivatedRoute )
  private patientService = inject( PatientsService )
  private invService = inject( InvServiceService )
  public selectedItem = computed(() => this.invService.selectedItem())
  public selectedUser = computed(() => this.patientService.selectedPatient() )
  
  public articleForm: FormGroup = this.fb.group({
    prodDesc      : [this.caller !== 'np' ? this.selectedItem()?.prodDesc : '', []],
    prodMinStock  : [this.caller !== 'np' ? this.selectedItem()?.prodMinStock : '', []],
    prodName      : [this.caller !== 'np' ?this.selectedItem()?.prodName : '', [Validators.required, Validators.maxLength(20)]],
    prodQty       : [this.caller !== 'np' ? this.selectedItem()?.prodQuantity || '' : '', [Validators.required]],
    prodUnitPrice : [this.caller !== 'np' ? this.selectedItem()?.prodUnitPrice : '', [Validators.required]],
  })

  public set frameTitle(v: string) {
    this.title = v;
  }
  
  ngOnInit(): void {
    const currentPath = this.activeRoute.snapshot.routeConfig?.path;
    if (currentPath === 'products/new-item') {
      this.caller = 'np';
      this.frameTitle = 'Registro de articulo';
      this.actionButtonText = 'Guardar';
      this.articleForm.reset();
    } else {
      this.frameTitle = 'Editar articulo';
      this.actionButtonText = 'Actualizar';
    }
  }

  public onHandleSubmit() {
    const article = this.articleForm.value
    this.caller === 'np'
    ? this.handleCreateArticle( article )
    : this.handleEditArticle( article )
  }

  private handleEditArticle( article: any ) {
    this.invService.updArticle(article, this.selectedItem()!.id)
      .subscribe({
        next: () => {
            Swal.fire('Success', `Article has been edited!`, 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/patients')
              })
        },
        error: ( error ) => {
          Swal.fire('Error', error.message, 'error')
        },
      })
  }

  private handleCreateArticle( artic: any ) {
    this.invService.saveArticle( artic )
      .subscribe({
        next: ( item ) => {
          if( item ) {
            const { prodName } = item?.data
            Swal.fire('Success', `${prodName} has been added!`, 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/patients')
              })
          }
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        },
      })
  }
}
