import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BarcodeFormat } from '@zxing/library';
import { ZXingScannerComponent } from '@zxing/ngx-scanner';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
  standalone: false
})
export class ScanPage implements OnInit {
  selectedDevice: MediaDeviceInfo | undefined;
  availableDevices: MediaDeviceInfo[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      this.availableDevices = devices.filter(d => d.kind === 'videoinput');
      this.selectedDevice = this.availableDevices[0];
    });
  }

  onCodeResult(result: string) {
  this.router.navigate(['/landmark', result]);
}

}
