/*
 * Licensed to Laurent Broudoux (the "Author") under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. Author licenses this
 * file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Component, OnInit } from '@angular/core';

import { BsModalService } from 'ngx-bootstrap/modal';
import { BsModalRef } from 'ngx-bootstrap/modal/bs-modal-ref.service';
import { Notification, NotificationEvent, NotificationService, NotificationType } from 'patternfly-ng/notification';
import { PaginationConfig, PaginationEvent } from 'patternfly-ng/pagination';
import { ToolbarConfig } from 'patternfly-ng/toolbar';
import { FilterConfig, FilterEvent, FilterField, FilterType } from 'patternfly-ng/filter';

import { DynamicAPIDialogComponent } from './_components/dynamic-api.dialog';
import { Service, Api } from '../../models/service.model';
import { IAuthenticationService } from "../../services/auth.service";
import { ServicesService } from '../../services/services.service';

@Component({
  selector: 'services-page',
  templateUrl: './services.page.html',
  styleUrls: ['./services.page.css']
})
export class ServicesPageComponent implements OnInit {

  modalRef: BsModalRef;
  services: Service[];
  servicesCount: number;
  toolbarConfig: ToolbarConfig;
  filterConfig: FilterConfig;
  paginationConfig: PaginationConfig;
  filterTerm: string = null;
  filtersText: string = '';
  notifications: Notification[];

  html:string = '';

  constructor(private servicesSvc: ServicesService, private modalService: BsModalService, 
    private notificationService: NotificationService, protected authService: IAuthenticationService) { }

  ngOnInit() {
    this.notifications = this.notificationService.getNotifications();
    this.getServices();
    this.countServices();

    this.paginationConfig = {
      pageNumber: 1,
      pageSize: 20,
      pageSizeIncrements: [],
      totalItems: 20
    } as PaginationConfig;

    this.filterConfig = {
      fields: [{
        id: 'name',
        title: 'Name',
        placeholder: 'Filter by Name...',
        type: FilterType.TEXT
      }] as FilterField[],
      resultsCount: 20,
      appliedFilters: []
    } as FilterConfig

    this.toolbarConfig = {
      actionConfig: undefined,
      filterConfig: this.filterConfig,
      sortConfig: undefined,
      views: []
    } as ToolbarConfig;
  }

  getServices(page: number = 1):void {
    this.servicesSvc.getServices(page).subscribe(results => this.services = results);
  }
  filterServices(filter: string): void {
    this.servicesSvc.filterServices(filter).subscribe(results => {
      this.services = results;
      this.filterConfig.resultsCount = results.length;
    });
  }

  countServices(): void {
    this.servicesSvc.countServices().subscribe(results => {
      this.servicesCount = results.counter;
      this.paginationConfig.totalItems = this.servicesCount;
    });
  }

  deleteService(service: Service) {
    console.log("[deleteService]: " + JSON.stringify(service));

    this.servicesSvc.deleteService(service).subscribe(
      {
        next: res => {
          this.notificationService.message(NotificationType.SUCCESS,
              service.name, "Service has been fully deleted", false, null, null);
          this.getServices();
          this.servicesCount--;
        },
        error: err => {
          this.notificationService.message(NotificationType.DANGER,
              service.name, "Service cannot be deleted (" + err.message + ")", false, null, null);
        },
        complete: () => console.log('Observer got a complete notification'),
      }
    );
  }

  selectService(service: Service) {
    this.html = '<ul>';
    service.operations.forEach(operation => {
      this.html += '<li>' + operation.name + '</li>';
    });
    this.html += '</ul>';
  }

  handlePageSize($event: PaginationEvent) {
    //this.updateItems();
  }

  handlePageNumber($event: PaginationEvent) {
    this.getServices($event.pageNumber)
  }

  handleFilter($event: FilterEvent): void {
    this.filtersText = '';
    if ($event.appliedFilters.length == 0) {
      this.filterTerm = null;
      this.getServices();
    } else {
      $event.appliedFilters.forEach((filter) => {
        this.filtersText += filter.field.title + ' : ' + filter.value + '\n';
        this.filterTerm = filter.value;
      });
      this.filterServices(this.filterTerm);
    }
  }

  openCreateDynamicAPI(): void {
    const initialState = {};
    this.modalRef = this.modalService.show(DynamicAPIDialogComponent, {initialState});
    this.modalRef.content.closeBtnName = 'Cancel';
    this.modalRef.content.createAction.subscribe((api) => {
      this.createDynamicAPI(api);
    });
  }
  
  createDynamicAPI(api: Api): void {
    this.servicesSvc.createDynamicAPI(api).subscribe(
      {
        next: res => {
          this.notificationService.message(NotificationType.SUCCESS,
              api.name, 'Dynamic API "' + api.name + '" has been created', false, null, null);
          this.getServices();
          this.countServices();
        },
        error: err => {
          this.notificationService.message(NotificationType.DANGER,
              api.name, 'Service or API "' + api.name + '"already exists with version ' + api.version, false, null, null);
        },
        complete: () => console.log('Observer got a complete notification'),
      }
    );
  }


  handleCloseNotification($event: NotificationEvent): void {
    this.notificationService.remove($event.notification);
  }

  public hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }
}
