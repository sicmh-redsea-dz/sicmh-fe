import { Pipe, PipeTransform } from '@angular/core';
import { formatIncomingData } from '../utils/date-formatters';

@Pipe({
  name: 'formatDate'
})
export class FormatDatePipe implements PipeTransform {

  transform(value: string | Date): string {
    return formatIncomingData(value)
  }

}
