import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms'

export const pressureValidator = (): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    const isValid = /^[0-9]{1,3}\|[0-9]{1,3}$/.test(value);
    return isValid ? null : { invalidPressure: 'El formato debe ser "###|###" con un máximo de 3 caracteres a cada lado.' };
  };
}