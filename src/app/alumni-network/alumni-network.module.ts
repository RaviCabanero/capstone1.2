import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { AlumniNetworkRoutingModule } from './alumni-network-routing.module';
import { AlumniNetworkPage } from './alumni-network.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    AlumniNetworkRoutingModule,
  ],
  declarations: [AlumniNetworkPage],
})
export class AlumniNetworkPageModule {}
