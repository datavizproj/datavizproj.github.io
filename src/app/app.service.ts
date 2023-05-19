import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, delay, catchError } from 'rxjs/operators';


import * as moment from 'moment';

import { TRAFFIC_DENSITY_FORM, ROAD } from "../interfaces";

@Injectable({
  providedIn: 'root'
})
export class AppService {

  private baseUrl: string = "https://routes.googleapis.com/directions/v2:computeRoutes";
  private apiKey: string = "AIzaSyBblD7PTMuTYdhnhpvCY9rUATRm4d-HylQ";
  private fieldMask: string = "routes.duration,routes.distanceMeters";

  private postBody = {
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    departureTime: 'null',
    computeAlternativeRoutes: false,
    languageCode: "en-US",
    units: "IMPERIAL"
  };

  constructor(private http: HttpClient) { }

  getTrafficeDensity(form: TRAFFIC_DENSITY_FORM) {
    let payload = {
      ...this.postBody, ...this.formatLocation(form.road)
    };

    // return this.getDataFromMap(payload, form.startDate).pipe(map((res: any) => {
    return this.getData(payload, form.startDate, form.road.name).pipe(map((res: any) => {
      return ({ label: form.startDate.toDateString(), data: res, backgroundColor: 'orange' });
    }),
      delay(5000),
      switchMap((firstData: any) => {
        // return this.getDataFromMap(payload, form.endDate).pipe(map((res: any) => {
        return this.getData(payload, form.endDate, form.road.name).pipe(map((res: any) => {
          const secondData = { label: form.endDate.toDateString(), data: res, backgroundColor: 'blue' };
          return [firstData, secondData];
        }))
      })
    );
  }

  private getData(payload: any, providedDate: Date, roadName: string) {
    const { year, month, date } = this.parseDate(providedDate);
    const timeStamp = new Date(year, month, date).getTime().toString();
    roadName = roadName.replaceAll(" ", "");
    const dataKey = timeStamp + roadName;

    const data = localStorage.getItem(dataKey);
    if (data) {
      const parsedData = JSON.parse(data);
      return of(parsedData);
    } else {
      return this.getDataFromMap(payload, providedDate).pipe(map((res: any) => {
        localStorage.setItem(dataKey, JSON.stringify(res));
        return (res);
      }));
    }
  }

  private parseDate(providedDate: Date) {
    let date = moment();
    const momentDate = moment(providedDate);
    const diff = date.diff(momentDate, 'days');
    date = moment().add(diff, 'days');


    return { year: date.toDate().getFullYear(), month: date.toDate().getMonth(), date: date.toDate().getDate() };
  }

  private formatLocation(road: ROAD) {
    const location = {
      origin: {
        location: {
          latLng: {
            latitude: road.startLat,
            longitude: road.startLong
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: road.endLat,
            longitude: road.endLong
          }
        }
      }
    }

    return location;
  }

  private getDataFromMap(payload: any, providedDate: Date): Observable<any[]> {
    const requests = [];
    for (let i = 0; i < 12; i++) {
      const { year, month, date } = this.parseDate(providedDate);
      const currPayload = JSON.parse(JSON.stringify(payload));
      currPayload.departureTime = new Date(year, month, date, i * 2).toISOString();
      requests.push(
        this.http.post(this.baseUrl, currPayload, {
          headers: new HttpHeaders()
            .set('X-Goog-Api-Key', this.apiKey)
            .set('X-Goog-FieldMask', this.fieldMask)
        })
          .pipe(
            map((res: any) => Math.round(((parseInt(res.routes[0].duration)) / (parseInt(res.routes[0].distanceMeters))) * 50)),
            catchError(error => {
              console.error('Request failed:', error);
              // Return a default value or an observable representing the failed request
              return of(0);
            })
          )
      );
    }

    return forkJoin(requests);
  }

}
