import { Component, DestroyRef, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { InventoryService } from '../../services/inventory-service/inventory.service';
import Swal from 'sweetalert2';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { DrawerService } from '../../services/drawer-service/drawer.service';
import { DrawerContents } from '../../interface/drawer-content.enum';
import { Article } from '../../interface/article.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../auth/services/auth.service';
import { trackById, trackBySelf } from '../../../shared/utils/track-by';

@Component({
  selector: 'app-inventory-page',
  templateUrl: './inventory-page.component.html',
  styleUrl: './inventory-page.component.css'
})
export class InventoryPageComponent implements OnInit {
  public trackById = trackById
  public trackBySelf = trackBySelf
  public headers: string[] = [
    'id',
    'Nombre',
    'Descripción',
    'Cantidad',
    'Precio Unitario'
  ]
  public searchTerm: string = ''
  public currentPage: number = 1
  public totalPages: number = 1
  public limit: number = 25
  public offset: number = 0
  public totalRegistries: number = 0
  public downloadingPdfReport: boolean = false
  public drawerParams = inject( DrawerService )
  private readonly searchTermSubject = new Subject<string>()
  private router = inject(Router)
  public bodyContent: Article[] = []
  private readonly invService = inject( InventoryService )
  public headerText: string = 'Inventario General'
  public subHeaderText: string = 'Fichero: General'
  public subinventoryId: string = '1'
  public showCreateButton: boolean = true
  public disableCreateButton: boolean = false
  public showTransferOpt: boolean = true
  public enableEdit: boolean = true
  public enableDelete: boolean = false
  private authService = inject(AuthService)
  public canCreateInventory = computed(() =>
    this.authService.hasPermission('inventory.create')
  )
  public canUpdateInventory = computed(() =>
    this.authService.hasPermission('inventory.update')
  )
  public canTransferInventory = computed(() =>
    this.authService.hasPermission('inventory.transfer')
  )
  private destroyRef = inject(DestroyRef)

  public inventoryTabs = [
    { id: '1', label: 'General', readOnly: false },
    { id: '2', label: 'Emergencia', readOnly: true },
    { id: '3', label: 'Quirofano', readOnly: true },
    { id: '4', label: 'Hospitalización', readOnly: true }
  ]

  constructor() {
    this.searchTermSubject.pipe(
      debounceTime( 700 ),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(( term: string) => {
      this.getInventoryItems( term )
    })
  }

  ngOnInit(): void {
    this.selectTab(this.inventoryTabs[0])
  }

  public selectTab(tab: { id: string; label: string; readOnly: boolean }) {
    this.subinventoryId = tab.id
    this.headerText = 'Inventario General'
    this.subHeaderText = `Fichero: ${tab.label}`

    const isReadOnly = tab.readOnly
    this.showCreateButton = true
    this.disableCreateButton = isReadOnly
    this.showTransferOpt = !isReadOnly
    this.enableEdit = !isReadOnly
    this.enableDelete = false

    this.currentPage = 1
    this.offset = 0
    this.searchTerm = ''
    this.getInventoryItems()
  }

  public handleSelectedItem( itemId: number | string ) {
    if ( !this.enableEdit || !this.canUpdateInventory() ) return
    this.invService.getInventoryItemById( itemId )
      .subscribe({
        next: ( item ) => {
          const { id } = item
          return this.router.navigateByUrl(`/dashboard/inventory/products/edit-item/${String( id )}`)
        },
        error: ( err ) => {
          Swal.fire('Error', err, 'error')
        }
      })
  }

  public getInventoryItems( term?: string ) {
    const search = (term ?? this.searchTerm).trim()
    
    this.invService.getInventoryItems({
      limit: this.limit,
      offset: this.offset,
      term: search
    }, this.subinventoryId
    ).subscribe({
      next: ( response ) => {
        const { data } = response
        const { resp, totalRegistries } = data
        this.bodyContent = resp as Article[]
        this.totalPages = Math.ceil((totalRegistries) / this.limit )
        this.totalRegistries = totalRegistries
      },
      error: ( msg ) => {
        Swal.fire('Error', msg, 'error')
      }
    })
  }

  bootstrapInvoiceDrawer( itemId?: number | string ) {
    if ( !this.showTransferOpt || !this.canTransferInventory() ) return
    if( itemId )
      this.drawerParams.setInvoiceId.set( String( itemId ) )
    
    this.drawerParams.isDrawerOpen.set( true )
    this.drawerParams.contentToDisplay.set( DrawerContents.TRANSFER )
    this.drawerParams.drawerTexts.update( state => ({
      ...state,
      header: 'generar transferencia',
      btnText: 'Generar'
    }))
  }

  public onSearchTermChange( term: string ) {
    this.searchTerm = term
    this.currentPage = 1
    this.offset = 0
    this.searchTermSubject.next( term )
  }

  public onPageChange(page: number) {
    this.currentPage = page
    this.offset = (this.currentPage - 1) * this.limit
    this.getInventoryItems()
  }

  public handleDeleteItem() {
    if ( !this.enableDelete || !this.canUpdateInventory() ) return
  }
}
