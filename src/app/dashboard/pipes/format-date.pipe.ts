import { Pipe, PipeTransform } from '@angular/core';
import { Patient } from '../interface/patients-response.interface';
import { formatIncomingData } from '../helpers/dateFormatters';

@Pipe({
  name: 'formatDate'
})
export class FormatDatePipe implements PipeTransform {

  transform(value: string | Date): string {
    // const formattedDate = value.toString().split('T')
    // return formattedDate[0]
    return formatIncomingData(value)
  }

}
