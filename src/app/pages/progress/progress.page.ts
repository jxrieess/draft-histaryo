import { Component, OnInit } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase.config';

interface ProgressStats {
  totalLandmarks: number;
  visitedLandmarks: number;
  stampsCollected: number;
  quizzesCompleted: number;
  averageQuizScore: number;
  badgesEarned: string[];
  visitedPercentage: number;
}

interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  completedAt: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
}

@Component({
  selector: 'app-progress',
  templateUrl: './progress.page.html',
  styleUrls: ['./progress.page.scss'],
  standalone: false
})
export class ProgressPage implements OnInit {
  stats: ProgressStats = {
    totalLandmarks: 0,
    visitedLandmarks: 0,
    stampsCollected: 0,
    quizzesCompleted: 0,
    averageQuizScore: 0,
    badgesEarned: [],
    visitedPercentage: 0
  };

  recentActivity: any[] = [];
  achievements: Achievement[] = [];
  loading = true;

  constructor(private storage: Storage) {}

  async ngOnInit() {
    await this.storage.create();
    await this.loadProgressData();
    this.calculateAchievements();
    this.loading = false;
  }

  async loadProgressData() {
    try {
      const [stamps, quizResults, landmarks] = await Promise.all([
        this.storage.get('stamps') || [],
        this.storage.get('quiz_results') || {},
        this.loadLandmarksCount()
      ]);

      this.stats.totalLandmarks = landmarks;
      this.stats.stampsCollected = Array.isArray(stamps) ? stamps.length : 0;
      this.stats.visitedLandmarks = this.stats.stampsCollected;
      this.stats.visitedPercentage = this.stats.totalLandmarks > 0 
        ? Math.round((this.stats.visitedLandmarks / this.stats.totalLandmarks) * 100) 
        : 0;

      const quizResultsArray = Object.values(quizResults) as QuizResult[];
      this.stats.quizzesCompleted = quizResultsArray.length;
      
      if (quizResultsArray.length > 0) {
        const totalScore = quizResultsArray.reduce((sum, result) => sum + result.percentage, 0);
        this.stats.averageQuizScore = Math.round(totalScore / quizResultsArray.length);
      }

      this.generateRecentActivity(stamps, quizResults);

    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  }

  async loadLandmarksCount(): Promise<number> {
    try {
      const snapshot = await getDocs(collection(db, 'landmarks'));
      return snapshot.size;
    } catch (error) {
      console.error('Error loading landmarks count:', error);
      return 6; 
    }
  }

  generateRecentActivity(stamps: string[], quizResults: any) {
    this.recentActivity = [];

    if (Array.isArray(stamps)) {
      stamps.forEach(stampId => {
        this.recentActivity.push({
          type: 'stamp',
          title: 'Landmark Visited',
          description: `Collected stamp for landmark`,
          icon: 'location',
          color: 'success',
          date: new Date().toISOString() 
        });
      });
    }

    Object.entries(quizResults).forEach(([landmarkId, result]: [string, any]) => {
      this.recentActivity.push({
        type: 'quiz',
        title: 'Quiz Completed',
        description: `Scored ${result.percentage}% on quiz`,
        icon: 'school',
        color: result.percentage >= 70 ? 'success' : 'warning',
        date: result.completedAt || new Date().toISOString()
      });
    });

    this.recentActivity.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    this.recentActivity = this.recentActivity.slice(0, 10);
  }

  calculateAchievements() {
    this.achievements = [
      {
        id: 'first_visit',
        title: 'First Steps',
        description: 'Visit your first landmark',
        icon: 'footsteps',
        color: 'success',
        unlocked: this.stats.visitedLandmarks >= 1
      },
      {
        id: 'explorer',
        title: 'Explorer',
        description: 'Visit 3 landmarks',
        icon: 'map',
        color: 'primary',
        unlocked: this.stats.visitedLandmarks >= 3,
        progress: this.stats.visitedLandmarks,
        maxProgress: 3
      },
      {
        id: 'heritage_expert',
        title: 'Heritage Expert',
        description: 'Visit all landmarks',
        icon: 'trophy',
        color: 'warning',
        unlocked: this.stats.visitedLandmarks >= this.stats.totalLandmarks,
        progress: this.stats.visitedLandmarks,
        maxProgress: this.stats.totalLandmarks
      },
      {
        id: 'quiz_master',
        title: 'Quiz Master',
        description: 'Complete 5 quizzes',
        icon: 'school',
        color: 'secondary',
        unlocked: this.stats.quizzesCompleted >= 5,
        progress: this.stats.quizzesCompleted,
        maxProgress: 5
      },
      {
        id: 'scholar',
        title: 'Scholar',
        description: 'Achieve 80% average quiz score',
        icon: 'library',
        color: 'tertiary',
        unlocked: this.stats.averageQuizScore >= 80,
        progress: this.stats.averageQuizScore,
        maxProgress: 80
      },
      {
        id: 'perfectionist',
        title: 'Perfectionist',
        description: 'Score 100% on any quiz',
        icon: 'star',
        color: 'warning',
        unlocked: false 
      }
    ];

    this.stats.badgesEarned = this.achievements
      .filter(achievement => achievement.unlocked)
      .map(achievement => achievement.id);
  }

  getProgressColor(percentage: number): string {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'warning';
    if (percentage >= 40) return 'primary';
    return 'medium';
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  }

  async clearProgress() {
    const confirmClear = confirm('Are you sure you want to clear all progress? This action cannot be undone.');
    if (confirmClear) {
      await this.storage.clear();
      await this.loadProgressData();
      this.calculateAchievements();
    }
  }
}