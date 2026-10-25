import { Directive, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

/** Keeps focus inside a suggestion list until selection or keyboard exit. */
@Directive({ selector: '[appAutocompleteKeyboard]' })
export class AutocompleteKeyboardDirective {
  @Output() autocompleteLeave = new EventEmitter<void>();

  constructor(private element: ElementRef<HTMLElement>) {}

  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    if (!event.relatedTarget || !this.element.nativeElement.contains(event.relatedTarget as Node)) {
      this.autocompleteLeave.emit();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const host = this.element.nativeElement;
    const input = host.querySelector<HTMLInputElement>('input:not([type="hidden"])');
    const options = Array.from(host.querySelectorAll<HTMLElement>('[data-autocomplete-option]'));
    const index = options.indexOf(event.target as HTMLElement);
    const inInput = event.target === input;
    if (!input || (!inInput && index < 0)) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      input.focus();
      this.autocompleteLeave.emit();
      return;
    }
    if (!options.length) return;

    let next: number | undefined;
    if (inInput && ((event.key === 'Tab' && !event.shiftKey) || event.key === 'ArrowDown')) next = 0;
    else if (inInput && event.key === 'ArrowUp') next = options.length - 1;
    else if (index >= 0 && event.key === 'ArrowDown') next = Math.min(index + 1, options.length - 1);
    else if (index >= 0 && event.key === 'ArrowUp') next = Math.max(index - 1, 0);
    else if (index >= 0 && event.key === 'Home') next = 0;
    else if (index >= 0 && event.key === 'End') next = options.length - 1;
    else if (index >= 0 && event.key === 'Tab' && event.shiftKey) {
      event.preventDefault();
      input.focus();
      return;
    } else if (index >= 0 && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      // Restore focus before selection closes and removes the option.
      input.focus();
      options[index].click();
      return;
    }
    if (next !== undefined) {
      event.preventDefault();
      options[next].focus();
      options[next].scrollIntoView({ block: 'nearest' });
    }
  }
}
