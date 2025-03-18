import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
  ],
  providers: [provideHttpClient(), provideFirebaseApp(() => initializeApp({"projectId":"sampleapp-d2514","appId":"1:922225932198:web:2a2ab70f430a5330f8c167","storageBucket":"sampleapp-d2514.firebasestorage.app","apiKey":"AIzaSyDKG7fmZ-xSS6nHaT_8FxIv8jCPRWZjVcE","authDomain":"sampleapp-d2514.firebaseapp.com","messagingSenderId":"922225932198"})), provideAuth(() => getAuth())],
  bootstrap: [AppComponent]
})
export class AppModule { }
