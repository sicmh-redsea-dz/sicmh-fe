import { Pipe, PipeTransform } from '@angular/core';
import { Patient } from '../interface/patients-response.interface';

@Pipe({
  name: 'formatDate'
})
export class FormatDatePipe implements PipeTransform {

  transform(value: Patient): string {
    const formattedDate = value.birthDate.toString().split('T')
    return formattedDate[0]
  }

}
