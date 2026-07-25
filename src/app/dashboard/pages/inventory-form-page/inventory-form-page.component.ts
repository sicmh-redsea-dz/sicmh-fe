import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { InventoryService } from '../../services/inventory-service/inventory.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-inventory-form-page',
  templateUrl: './inventory-form-page.component.html',
  styleUrl: './inventory-form-page.component.css'
})
export class InventoryFormPageComponent implements OnInit {
public title = ''
  public caller = ''
  public actionButtonText = ''
  public itemId: number | null = null
  private fb = inject( FormBuilder )
  private router = inject( Router )
  private activeRoute = inject( ActivatedRoute )
  private invService = inject( InventoryService )
  private destroyRef = inject( DestroyRef )
  
  public articleForm: FormGroup = this.fb.group({
    prodDesc      : ['', []],
    prodMinStock  : ['', []],
    prodName      : ['', [Validators.required, Validators.maxLength(20)]],
    prodQty       : ['', [Validators.required, Validators.min(0)]],
    prodUnitPrice : ['', [Validators.required, Validators.min(0)]],
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
      this.caller = 'ep';
      this.frameTitle = 'Editar articulo';
      this.actionButtonText = 'Actualizar';
      this.activeRoute.paramMap
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((params) => {
          const id = params.get('id');
          if (id) {
            this.loadItem(id);
          }
        })
    }
  }

  public onHandleSubmit() {
    if (this.articleForm.invalid) {
      this.articleForm.markAllAsTouched()
      return
    }
    const article = this.articleForm.value
    this.caller === 'np'
    ? this.handleCreateArticle( article )
    : this.handleEditArticle( article )
  }

  private handleEditArticle( article: any ) {
    if (this.itemId === null) return
    this.invService.updArticle(article, this.itemId)
      .subscribe({
        next: () => {
            Swal.fire('Success', `Article has been edited!`, 'success')
              .then(() => {
                this.router.navigateByUrl('/dashboard/inventory/products')
              })
        },
        error: ( error ) => {
          Swal.fire('Error', error, 'error')
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
                this.router.navigateByUrl('/dashboard/inventory/products')
              })
          }
        },
        error: (message) => {
          Swal.fire('Error', message, 'error')
        },
      })
  }

  private loadItem(id: string) {
    this.invService.getInventoryItemById(id)
      .subscribe({
        next: ( item ) => {
          this.itemId = item.id
          this.articleForm.patchValue({
            prodDesc: item.prodDesc,
            prodMinStock: item.prodMinStock,
            prodName: item.prodName,
            prodQty: item.prodQuantity,
            prodUnitPrice: item.prodUnitPrice,
          })
        },
        error: ( err ) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }
}
