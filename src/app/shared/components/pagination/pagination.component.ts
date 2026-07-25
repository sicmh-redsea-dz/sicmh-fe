import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { trackBySelf } from '../../utils/track-by';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css'
})
export class PaginationComponent implements OnChanges {
  public trackBySelf = trackBySelf
  @Input() currentPage: number = 1
  @Input() totalPages: number = 10
  @Input() offset: number = 0
  @Input() totalRegistries: number = 1
  @Input() pageSize: number = 25;
  @Output() pageChange = new EventEmitter<number>()

  public displayedPages: number[] = []
  public displayedCount: Record<string, number> = { min: 0, max: 25}
  
  ngOnChanges(changes: SimpleChanges): void {
    if( 
      changes['currentPage'] ||
      changes['totalPages'] ||
      changes['offset'] ||
      changes['totalRegistries'] ||
      changes['pageSize']
    ) {
      this.updateDisplayedPages()
      this.updateDataCount()
    }
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--
      this.pageChange.emit( this.currentPage )
      this.updateDataCount()
      this.updateDisplayedPages()
    }
  }
  
  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++
      this.pageChange.emit( this.currentPage )
      this.updateDataCount()
      this.updateDisplayedPages()
    }
  }
  
  goToPage(page: number) {
    this.currentPage = page;
    this.pageChange.emit( this.currentPage )
    this.updateDataCount()
    this.updateDisplayedPages();
  }

  public updateDataCount() {
    const min = this.offset + 1;
    const max = Math.min(this.offset + this.pageSize, this.totalRegistries);

    this.displayedCount = { min, max };
  }

  
  public updateDisplayedPages() {
    const pagesToShow = 4;
    const pages = [];
    let startPage: number, endPage: number;

    if (this.totalPages <= pagesToShow) {
      startPage = 1;
      endPage = this.totalPages;
    } else if (this.currentPage <= 2) {
      startPage = 1;
      endPage = pagesToShow;
    } else if (this.currentPage + 1 >= this.totalPages) {
      startPage = this.totalPages - (pagesToShow - 1);
      endPage = this.totalPages;
    } else {
      startPage = this.currentPage - 1;
      endPage = this.currentPage + 2;
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    this.displayedPages = pages;
  }
}
