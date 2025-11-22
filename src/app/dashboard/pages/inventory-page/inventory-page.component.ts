import { Component, inject, OnInit } from '@angular/core';
import { InvServiceService } from '../../services/inventory-service/inv-service.service';
import Swal from 'sweetalert2';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-inventory-page',
  templateUrl: './inventory-page.component.html',
  styleUrl: './inventory-page.component.css'
})
export class InventoryPageComponent implements OnInit {
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
  private searchTermSubject = new Subject<string>()

  public bodyContent: any[] = []
  private readonly invService = inject( InvServiceService )

  constructor() {
    this.searchTermSubject.pipe(
      debounceTime( 700 ),
      distinctUntilChanged()
    ).subscribe(( term: string) => {
      this.getInventoryItems( term )
    })
  }

  ngOnInit(): void {
    this.getInventoryItems()
  }

  public some() {}

  public getInventoryItems( term?: string ) {
    const search = (term ?? this.searchTerm).trim()
    
    this.invService.getInventoryItems({
      limit: this.limit,
      offset: this.offset,
      term: search
    }).subscribe({
      next: ( response ) => {
        const { data } = response
        const { resp, totalRegistries } = data
        this.bodyContent = resp
        this.totalPages = Math.ceil((totalRegistries) / this.limit )
        this.totalRegistries = totalRegistries
      },
      error: ( msg ) => {
        Swal.fire('Error', msg, 'error')
      }
    })
  }

  public onSearchTermChange( term: string ) {
    this.searchTerm = term
    this.searchTermSubject.next( term )
  }

  public onPageChange(page: number) {
    this.currentPage = page
    this.offset = (this.currentPage - 1) * this.limit
    this.getInventoryItems()
  }
}
