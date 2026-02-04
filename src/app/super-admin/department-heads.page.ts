import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AdminService } from '../services/admin.service';
import { Observable, of, from, startWith } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-department-heads',
  templateUrl: './department-heads.page.html',
  styleUrls: ['./department-heads.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class DepartmentHeadsPage implements OnInit {
  deptHeads$: Observable<any[]>;
  selectedHead: any = null;

  constructor(private adminService: AdminService) {
    this.deptHeads$ = of(null).pipe(
      switchMap(() => from(this.adminService.getDepartmentHeads())),
      startWith([])
    );
  }

  ngOnInit() {
    this.loadDepartmentHeads();
  }

  loadDepartmentHeads() {
    this.deptHeads$ = of(null).pipe(
      switchMap(() => from(this.adminService.getDepartmentHeads())),
      startWith([])
    );
  }

  selectHead(head: any) {
    this.selectedHead = head;
  }
}
