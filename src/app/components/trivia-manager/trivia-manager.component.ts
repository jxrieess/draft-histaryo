import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { LandmarkService, TriviaQuestion } from '../../services/landmark.service';

interface QuizState {
  currentQuestionIndex: number;
  selectedAnswers: number[];
  score: number;
  totalQuestions: number;
  isCompleted: boolean;
  canCollectStamp: boolean;
}

@Component({
  selector: 'app-trivia-manager',
  templateUrl: './trivia-manager.component.html',
  styleUrls: ['./trivia-manager.component.scss'],
  standalone: false
})
export class TriviaManagerComponent implements OnInit {
  @Input() landmarkId: string = '';
  @Input() landmarkName: string = '';
  @Input() mode: 'view' | 'quiz' = 'quiz'; 
  @Output() triviaLoaded = new EventEmitter<TriviaQuestion[]>();
  @Output() quizCompleted = new EventEmitter<{score: number, totalQuestions: number, canCollectStamp: boolean}>();

  existingTrivia: TriviaQuestion[] = [];
  isLoading = false;
  
  quizState: QuizState = {
    currentQuestionIndex: 0,
    selectedAnswers: [],
    score: 0,
    totalQuestions: 0,
    isCompleted: false,
    canCollectStamp: false
  };
  
  showAnswer = false;
  showResult = false;

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private landmarkService: LandmarkService
  ) {}

  ngOnInit() {
    this.loadExistingTrivia();
  }

  async loadExistingTrivia() {
    this.isLoading = true;
    try {
      this.existingTrivia = await this.landmarkService.getTriviaQuestionsForLandmark(this.landmarkId);
      
      if (this.existingTrivia.length === 0) {
        await this.showToast('No trivia questions available for this landmark', 'warning');
      }
      
      this.initializeQuiz();
      
      this.triviaLoaded.emit(this.existingTrivia);
    } catch (error) {
      console.error('Error loading trivia from Firebase:', error);
      await this.showToast('Failed to load trivia questions', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  private initializeQuiz() {
    this.quizState = {
      currentQuestionIndex: 0,
      selectedAnswers: new Array(this.existingTrivia.length).fill(-1),
      score: 0,
      totalQuestions: this.existingTrivia.length,
      isCompleted: false,
      canCollectStamp: false
    };
    this.showAnswer = false;
    this.showResult = false;
  }

  selectAnswer(answerIndex: number) {
    if (this.mode === 'view' || this.showAnswer || this.quizState.isCompleted) return;
    
    this.quizState.selectedAnswers[this.quizState.currentQuestionIndex] = answerIndex;
    this.showAnswer = true;
    
    const currentQuestion = this.existingTrivia[this.quizState.currentQuestionIndex];
    
    const correctAnswerIndex = currentQuestion.correctAnswer;
    
    
    const isCorrect = answerIndex === correctAnswerIndex;
    
    if (isCorrect) {
      this.quizState.score++;
      this.showToast('Correct! 🎉', 'success');
    } else {
      this.showToast(`Incorrect! The correct answer was option ${String.fromCharCode(65 + correctAnswerIndex)}.`, 'warning');
    }
    
    setTimeout(() => {
      this.nextQuestion();
    }, 2000);
  }

  nextQuestion() {
    if (this.quizState.currentQuestionIndex < this.quizState.totalQuestions - 1) {
      this.quizState.currentQuestionIndex++;
      this.showAnswer = false;
    } else {
      this.completeQuiz();
    }
  }

  previousQuestion() {
    if (this.quizState.currentQuestionIndex > 0) {
      this.quizState.currentQuestionIndex--;
      this.showAnswer = false;
    }
  }

  private completeQuiz() {
    this.quizState.isCompleted = true;
    this.showResult = true;
    
    this.quizState.canCollectStamp = (this.quizState.score / this.quizState.totalQuestions) >= 0.7;
    
    this.quizCompleted.emit({
      score: this.quizState.score,
      totalQuestions: this.quizState.totalQuestions,
      canCollectStamp: this.quizState.canCollectStamp
    });
    
    if (this.quizState.canCollectStamp) {
      this.showToast(`Quiz completed! You scored ${this.quizState.score}/${this.quizState.totalQuestions}. You can now collect your stamp! 🎉`, 'success');
    } else {
      this.showToast(`Quiz completed! You scored ${this.quizState.score}/${this.quizState.totalQuestions}. Score at least 70% to collect a stamp.`, 'warning');
    }
  }

  restartQuiz() {
    this.initializeQuiz();
  }

  getCurrentQuestion(): TriviaQuestion | null {
    return this.existingTrivia[this.quizState.currentQuestionIndex] || null;
  }

  isAnswerSelected(answerIndex: number): boolean {
    return this.quizState.selectedAnswers[this.quizState.currentQuestionIndex] === answerIndex;
  }

  isCorrectAnswer(answerIndex: number): boolean {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return false;
    
    return answerIndex === currentQuestion.correctAnswer;
  }

  isWrongAnswer(answerIndex: number): boolean {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return false;
    
    const selectedAnswer = this.quizState.selectedAnswers[this.quizState.currentQuestionIndex];
    
    return selectedAnswer === answerIndex && answerIndex !== currentQuestion.correctAnswer;
  }

  getScorePercentage(): number {
    if (this.quizState.totalQuestions === 0) return 0;
    return Math.round((this.quizState.score / this.quizState.totalQuestions) * 100);
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary' = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
      buttons: [
        {
          text: 'Dismiss',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }

  async closeModal() {
    await this.modalController.dismiss({
      canCollectStamp: this.quizState.canCollectStamp,
      score: this.quizState.score,
      totalQuestions: this.quizState.totalQuestions,
      isCompleted: this.quizState.isCompleted
    });
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'danger';
      default:
        return 'medium';
    }
  }

  getDifficultyIcon(difficulty: string): string {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'checkmark-circle';
      case 'medium':
        return 'alert-circle';
      case 'hard':
        return 'warning';
      default:
        return 'help-circle';
    }
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }
}
