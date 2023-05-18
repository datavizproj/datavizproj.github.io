import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import Chart from 'chart.js/auto';
import * as moment from 'moment';

import { AppService } from "./app.service";
import { AVAILABLE_ROADS } from "../constants";

declare var google: any;
const hyderabad = { lat: 17.3850, lng: 78.4867 };

export type TDLoadingState = 'idle' | 'start' | 'loaded' | 'error'; // traffic density loading state

const today = moment();
const maxStartDate = moment().subtract(2, 'days');
const maxEndDate = moment().subtract(1, 'days');

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  private map: any; // container for google maps

  // @ViewChild('myChart') private chartRef: any | ElementRef;
  private chart: any;

  private roads = AVAILABLE_ROADS;
  public filteredOptions: Observable<any[]>;
  public tdLoadingState: TDLoadingState = 'idle';

  public form: FormGroup = new FormGroup({
    road: new FormControl(null, Validators.required),
    startDate: new FormControl(maxStartDate.toDate(), Validators.required),
    endDate: new FormControl(maxEndDate.toDate(), Validators.required)
  });

  constructor(private appService: AppService) {
    this.filteredOptions = this.form.controls['road'].valueChanges.pipe(
      startWith(''),
      map(value => {
        const name = typeof value === 'string' ? value : value?.name;
        return name ? this._filter(name as string) : this.roads.slice();
      }),
    );
  }

  ngOnInit(): void {
    console.log('today: ', today.toDate());
    console.log('maxStartDate: ', maxStartDate.toDate());
    console.log('maxEndDate: ', maxEndDate.toDate());

    this.initializeLiveTrafficView();  
    // this.getTrafficeDensity();
    
  }
  
  ngAfterViewInit(): void {
    // this.initializeChart(data);
    
  }

  private initializeChart(chartData: any[]) {
    let ctx: any = document.getElementById('myChart');

    console.log('ctx: ', ctx)

    if (!ctx) return;
    ctx = ctx.getContext('2d')
    // const ctx = this.chartRef.nativeElement.getContext('2d');
  
    const data = {
      labels: ['1 AM', '3 AM', '5 AM', '7 AM', '9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM', '9 PM', '11 PM'],
      datasets: chartData
    };
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Traffic Density'
          }
        }
      }
    });
    this.chart.update();

    // setTimeout(() => {
    //   console.log('updategin')
    //   this.chart.data.datasets[0].data = [...this.chart.data.datasets[0].data, [10]];
    //   this.chart.update();
    // }, 1000 * 5);
  }

  displayFn(road: any): string {
    return road && road.name ? road.name : '';
  }

  private _filter(name: string): any[] {
    const filterValue = name.toLowerCase();

    return this.roads.filter(road => road.name.toLowerCase().includes(filterValue));
  }

  public onSubmit() {
    console.log('this.form.value: ', this.form.value);
    this.tdLoadingState = 'start';
    const { value } = this.form;
    this.appService.getTrafficeDensity(value).subscribe({
      next: (data) => {
        console.log('data ======================================================');
        console.log(data);
        this.initializeChart(data);

        this.tdLoadingState = 'loaded';
      },
      error: (err) => {
        console.log('data ======================================================');
        console.log(err);

        this.tdLoadingState = 'error';
      }
    });
  }

  public onSelectStartDate(event: MatDatepickerInputEvent<Date>): void {
    const startDate: any = event.value;
    console.log('startDate: ', startDate);


    if (startDate >= today) {

      // this.startDate.setValue(null);
    }
  }

  public onSelectEndDate(event: MatDatepickerInputEvent<Date>): void {
    const endDate: any = event.value;
    console.log('endDate: ', endDate);


    if (endDate >= today) {
      // this.endDate.setValue(null);
    }
  }

  private getTrafficeDensity() {
    const payload = {
      "origin": {
        "location": {
          "latLng": {
            "latitude": 17.447088,
            "longitude": 78.363808
          }
        }
      },
      "destination": {
        "location": {
          "latLng": {
            "latitude": 17.439772,
            "longitude": 78.376596
          }
        }
      },
      "travelMode": "DRIVE",
      "routingPreference": "TRAFFIC_AWARE",
      "departureTime": "2023-05-18T15:45:55.417Z",
      "computeAlternativeRoutes": false,
      "languageCode": "en-US",
      "units": "IMPERIAL"
    };

    // this.appService.retrieveData(payload).subscribe(data => {

    // })
  }

  private initializeLiveTrafficView() {
    this.map = new google.maps.Map(document.getElementById('map'), {
      center: hyderabad,
      zoom: 13
    });

    let trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(this.map);

    let legend: any = document.createElement('div');
    legend.id = 'legend';
    let content = [];
    content.push('<div class="legend-title">Traffic Conditions</div>');
    content.push('<div class="legend-item"><div class="legend-color bg-green"></div><div class="legend-text">Good</div></div>');
    content.push('<div class="legend-item"><div class="legend-color bg-yellow"></div><div class="legend-text">Moderate</div></div>');
    content.push('<div class="legend-item"><div class="legend-color bg-red"></div><div class="legend-text">Heavy</div></div>');
    content.push('<div class="legend-item"><div class="legend-color bg-black"></div><div class="legend-text">Very Heavy</div></div>');
    content.push('<div class="legend-item"><div class="legend-color bg-gray"></div><div class="legend-text">Blocked Road</div></div>');
    legend.innerHTML = content.join('');
    legend.index = 1;
    this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legend);
  }
}
