import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';

import { ProfileEditPageRoutingModule } from './profile-edit-routing.module';
import { ProfileEditPage } from './profile-edit.page';

@NgModule({
  imports: [CommonModule, IonicModule, ReactiveFormsModule, ProfileEditPageRoutingModule, ProfileEditPage],
})
export class ProfileEditPageModule {}
