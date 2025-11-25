import { Component, inject, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { InvServiceService } from '../../services/inventory-service/inv-service.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-subinv-one-page',
  templateUrl: './subinv-one-page.component.html',
  styleUrl: './subinv-one-page.component.css'
})
export class SubinvOnePageComponent implements OnInit {
   public headers: string[] = [
    'id',
    'Nombre',
    'Descripción',
    'Cantidad',
    'Precio Unitario'
  ]
  public totalRegistries: number = 0
  public downloadingPdfReport: boolean = false
  public bodyContent: any[] = []

  public searchTerm: string = ''
  public currentPage: number = 1
  public totalPages: number = 1
  public limit: number = 25
  public offset: number = 0
  public searchTermSubject: Subject<string> = new Subject<string>()
  private readonly invService = inject( InvServiceService )

  ngOnInit(): void {
    this.getInventoryItems()
  }
  
  some() {}

  getInventoryItems( term?: string ) {
      const search = (term ?? this.searchTerm).trim()
      
      this.invService.getInventoryItems({
        limit: this.limit,
        offset: this.offset,
        term: search
      }, '2'
      ).subscribe({
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

  onSearchTermChange( term: string ) {
    this.searchTerm = term
    this.searchTermSubject.next( term )
  }

  onPageChange(page: number) {
    this.currentPage = page
    this.offset = (this.currentPage - 1) * this.limit
    // this.getInventoryItems()
  }
}
