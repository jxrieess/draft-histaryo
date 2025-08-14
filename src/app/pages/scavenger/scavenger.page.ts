import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-scavenger',
  templateUrl: './scavenger.page.html',
  styleUrls: ['./scavenger.page.scss'],
  standalone: false
})
export class ScavengerPage implements OnInit {
  landmarkId: string = '';
  question: string = '';
  options: string[] = [];
  correctAnswer: string = '';
  selectedAnswer: string = '';
  answered: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storage: Storage,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    await this.storage.create();

    this.route.queryParams.subscribe((params) => {
      this.landmarkId = params['id'] || '';
      this.loadQuestion(this.landmarkId);
    });
  }

  loadQuestion(id: string) {
    // You can replace this with Firestore later
    if (id === 'fort-san-pedro') {
      this.question = 'Who built Fort San Pedro?';
      this.options = ['Americans', 'Cebuanos', 'Spaniards', 'Japanese'];
      this.correctAnswer = 'Spaniards';
    }
  }

  async submitAnswer() {
    if (this.answered) return;

    this.answered = true;

    if (this.selectedAnswer === this.correctAnswer) {
      await this.awardStamp(this.landmarkId);
      this.showToast('Correct! Stamp awarded. ✅');
    } else {
      this.showToast('Oops! Wrong answer.');
    }
  }

  async awardStamp(id: string) {
    const stamps: string[] = (await this.storage.get('stamps')) || [];
    if (!stamps.includes(id)) {
      stamps.push(id);
      await this.storage.set('stamps', stamps);
    }
  }

  async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color: 'primary',
    });
    await toast.present();
  }
}
