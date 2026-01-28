import { Component, OnInit } from '@angular/core'
import { FormBuilder, FormGroup } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrl: './my-profile.component.css'
})
export class MyProfileComponent implements OnInit {
  
  profileForm!: FormGroup;
  userImageUrl: string | null = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      username: [''],
      email: [''],
      language: ['es'],
      theme: ['light']
    });
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.userImageUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile(): void {
    Swal.fire('Éxito', 'Cambios guardados con éxito', 'success');
  }

  toggleTheme(): void {
    const current = this.profileForm.get('theme')?.value;
    const next = current === 'dark' ? 'light' : 'dark';
    this.profileForm.patchValue({ theme: next });
  }
  
}
