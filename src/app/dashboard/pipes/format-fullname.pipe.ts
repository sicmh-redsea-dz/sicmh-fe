import { Pipe, PipeTransform } from '@angular/core';
import { Patient } from '../interface/patients-response.interface';

@Pipe({
  name: 'formatFullname'
})
export class FormatFullnamePipe implements PipeTransform {

  transform(value: Patient): string {
    return `${value.name} ${value.lastName}`;
  }

}
