import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { SubscriptionService } from '../services/subscription.service';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: false,
  animations: [
    trigger('resultsAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('cardSlideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeInScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class FolderPage implements OnInit {
  public folder!: string;
  public notificationCount = 3; // Example notification count
  public selectedSegment = 'nifty';
  public calculatorForm: FormGroup;
  public showResults = false;
  public pivotResults = {
    entryPoint: 0,
    stopLoss: 0,
    targetOne: 0,
    targetTwo: 0,
    targetThree: 0,
    targetFour: 0,
    targetFive: 0
  };
  
  // Subscription properties
  public hasActiveSubscription: boolean = false;
  public isCheckingSubscription: boolean = true;
  public activeSubscription: any = null;
  
  private activatedRoute = inject(ActivatedRoute);
  
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private subscriptionService: SubscriptionService,
    private authService: AuthService
  ) {
    this.calculatorForm = this.formBuilder.group({
      open: ['', [Validators.required, Validators.min(0)]],
      high: ['', [Validators.required, Validators.min(0)]],
      low: ['', [Validators.required, Validators.min(0)]],
      last: ['', [Validators.required, Validators.min(0)]],
      stockName: [''],
      futureClosePrice: ['', [Validators.min(0)]], 
    });
  }

  ngOnInit() {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id') || 'Home';
    this.checkSubscriptionStatus();
  }

  async checkSubscriptionStatus() {
    this.isCheckingSubscription = true;
    
    try {
      const subscription = await firstValueFrom(
        this.subscriptionService.getMySubscription()
      );
      
      if (subscription) {
        this.hasActiveSubscription = true;
        this.activeSubscription = subscription;
      } else {
        this.hasActiveSubscription = false;
        this.activeSubscription = null;
      }
    } catch (error) {
      // If error (401, 404, etc.), assume no subscription
      console.log('No active subscription found');
      this.hasActiveSubscription = false;
      this.activeSubscription = null;
    } finally {
      this.isCheckingSubscription = false;
    }
  }

  navigateToSubscriptions() {
    this.router.navigate(['/subscriptions']);
  }

  onSegmentChange(event: any) {
    this.selectedSegment = event.detail.value;
    console.log('Segment changed to:', this.selectedSegment);
    
    // Reset results when switching tabs
    this.showResults = false;
    
    // Update form validation based on selected segment
    if (this.selectedSegment === 'stock') {
      // Stock tab: stockName and futureClosePrice are optional
      this.calculatorForm.get('stockName')?.clearValidators();
      this.calculatorForm.get('futureClosePrice')?.clearValidators();
    } else {
      // NIFTY tab: stockName and futureClosePrice not needed
      this.calculatorForm.get('stockName')?.clearValidators();
      this.calculatorForm.get('futureClosePrice')?.clearValidators();
    }
    this.calculatorForm.get('stockName')?.updateValueAndValidity();
    this.calculatorForm.get('futureClosePrice')?.updateValueAndValidity();
  }

  // Helper function to round up to nearest integer
  roundUp(value: number): number {
    return Math.ceil(value);
  }

  // Calculate Camarilla Pivot Points (for Entry/Stop Loss)
  calculateCamarillaPivotPoints(high: number, low: number, last: number) {
    const range = high - low;
    const pp = (high + low + last) / 3;
    
    const r1 = last + (range * 1.1) / 12;
    const r2 = last + (range * 1.1) / 6;
    const r3 = last + (range * 1.1) / 4;
    const r4 = last + (range * 1.1) / 2;
    
    const s1 = last - (range * 1.1) / 12;
    const s2 = last - (range * 1.1) / 6;
    const s3 = last - (range * 1.1) / 4;
    const s4 = last - (range * 1.1) / 2;
    
    return { pp, r1, r2, r3, r4, s1, s2, s3, s4 };
  }

  // Calculate Classic Pivot Points (for Targets)
  calculateClassicPivotPoints(high: number, low: number, last: number) {
    const pp = (high + low + last) / 3;
    
    const r1 = 2 * pp - low;
    const r2 = pp + (high - low);
    const r3 = high + 2 * (pp - low);
    const r4 = high + 3 * (pp - low);
    const r5 = high + 4 * (pp - low);
    
    return { pp, r1, r2, r3, r4, r5 };
  }

  // Calculate NIFTY Entry Point and Stop Loss
  calculateNiftyEntryStopLoss(camarillaPP: number, camarillaR1: number, camarillaS1: number) {
    // Entry Point = midpoint(PP, R1) rounded up + 20
    const entryMidpoint = (camarillaPP + camarillaR1) / 2;
    const entryPoint = this.roundUp(entryMidpoint) + 20;
    
    // Stop Loss = midpoint(PP, S1) rounded up - 2
    const stopLossMidpoint = (camarillaPP + camarillaS1) / 2;
    const stopLoss = this.roundUp(stopLossMidpoint) - 2;
    
    return { entryPoint, stopLoss };
  }

  // Calculate NIFTY Targets
  calculateNiftyTargets(classicR1: number, classicR2: number) {
    // Target 1 = R1 (Classic)
    const targetOne = classicR1;
    
    // Target 2 = midpoint(R1, R2) (Classic)
    const targetTwo = (classicR1 + classicR2) / 2;
    
    // Target 3 = R2 (Classic)
    const targetThree = classicR2;
    
    // Target 4 = R2 + 16
    const targetFour = classicR2 + 16;
    
    // Target 5 = Target 4 + 20
    const targetFive = targetFour + 20;
    
    return { targetOne, targetTwo, targetThree, targetFour, targetFive };
  }

  // Round Entry Point for Stock Options
  // Examples: 1.74 → 1.75, 1.81 → 1.85, 1.75 → 1.75, 1.56 → 1.60, 1.89 → 1.90, 1.01 → 1.05, 1.06 → 1.10
  roundEntryPoint(value: number): number {
    // Round to 2 decimal places first to handle floating point precision
    const rounded = Math.round(value * 100) / 100;
    
    // Get the integer part and decimal part
    const integerPart = Math.floor(rounded);
    const decimalPart = rounded - integerPart;
    
    // Get the last decimal digit (hundredths place)
    const lastDigit = Math.round((decimalPart * 100) % 10);
    
    if (lastDigit === 0) {
      // Already rounded to .00, .10, .20, etc. (like 1.00, 1.10, 1.20)
      return rounded;
    } else if (lastDigit >= 1 && lastDigit <= 4) {
      // Round up to 5 (e.g., 1.74 → 1.75, 1.81 → 1.85, 1.01 → 1.05)
      const tensPlace = Math.floor(decimalPart * 10);
      return integerPart + tensPlace / 10 + 0.05;
    } else if (lastDigit === 5) {
      // Keep as is (e.g., 1.75 → 1.75, 1.5 → 1.5)
      return rounded;
    } else if (lastDigit >= 6 && lastDigit <= 9) {
      // Round up to next 0 (e.g., 1.56 → 1.60, 1.89 → 1.90, 1.06 → 1.10)
      const tensPlace = Math.ceil(decimalPart * 10);
      return integerPart + tensPlace / 10;
    }
    
    return rounded;
  }

  // Round Stop Loss for Stock Options
  // Examples: 1.71 → 1.70, 1.83 → 1.80, 1.75 → 1.75, 1.76 → 1.75, 1.89 → 1.85
  roundStopLoss(value: number): number {
    // Round to 2 decimal places first to handle floating point precision
    const rounded = Math.round(value * 100) / 100;
    
    // Get the integer part and decimal part
    const integerPart = Math.floor(rounded);
    const decimalPart = rounded - integerPart;
    
    // Get the last decimal digit (hundredths place)
    const lastDigit = Math.round((decimalPart * 100) % 10);
    
    if (lastDigit === 0) {
      // Already rounded to .00, .10, .20, etc. (like 1.00, 1.10, 1.20)
      return rounded;
    } else if (lastDigit >= 1 && lastDigit <= 4) {
      // Round down to 0 (e.g., 1.71 → 1.70, 1.83 → 1.80)
      const tensPlace = Math.floor(decimalPart * 10);
      return integerPart + tensPlace / 10;
    } else if (lastDigit === 5) {
      // Keep as is (e.g., 1.75 → 1.75)
      return rounded;
    } else if (lastDigit >= 6 && lastDigit <= 9) {
      // Round down to 5 (e.g., 1.76 → 1.75, 1.89 → 1.85)
      const tensPlace = Math.floor(decimalPart * 10);
      return integerPart + tensPlace / 10 + 0.05;
    }
    
    return rounded;
  }

  // Get Entry Point Range Addition based on midpoint value
  getEntryPointRangeAddition(midpoint: number): number {
    if (midpoint >= 1 && midpoint <= 400) {
      return 0.0040; // 0.40 paise
    } else if (midpoint >= 401 && midpoint <= 2000) {
      return 0.0060; // 0.60 paise
    } else if (midpoint >= 2001 && midpoint <= 3500) {
      return 1.20; // 1.20 rs
    } else if (midpoint >= 3501 && midpoint <= 5000) {
      return 2.40; // 2.40 rs
    } else if (midpoint >= 5001 && midpoint <= 8000) {
      return 4.30; // 4.30 rs
    }
    return 0;
  }

  // Get Stop Loss Range Subtraction based on midpoint value
  getStopLossRangeSubtraction(midpoint: number): number {
    if (midpoint >= 1 && midpoint <= 400) {
      return 0.0050; // 0.50 paise
    } else if (midpoint >= 401 && midpoint <= 2000) {
      return 2.00; // 2 rs
    } else if (midpoint >= 2001 && midpoint <= 3500) {
      return 5.50; // 5.50 rs
    } else if (midpoint >= 3501 && midpoint <= 5000) {
      return 6.60; // 6.6 rs
    } else if (midpoint >= 5001 && midpoint <= 8000) {
      return 8.70; // 8.70 rs
    }
    return 0;
  }

  // Calculate Stock Entry Point
  calculateStockEntryPoint(camarillaPP: number, camarillaR1: number): number {
    // Calculate midpoint
    const midpoint = (camarillaPP + camarillaR1) / 2;
    
    // Round midpoint
    const rounded = this.roundEntryPoint(midpoint);
    
    // Get range addition
    const addition = this.getEntryPointRangeAddition(rounded);
    
    // Final entry point
    return rounded + addition;
  }

  // Calculate Stock Stop Loss
  calculateStockStopLoss(classicPP: number, classicR1: number): number {
    // Calculate midpoint
    const midpoint = (classicPP + classicR1) / 2;
    
    // Round midpoint
    const rounded = this.roundStopLoss(midpoint);
    
    // Get range subtraction
    const subtraction = this.getStopLossRangeSubtraction(rounded);
    
    // Final stop loss
    return rounded - subtraction;
  }

  // Calculate Stock Targets (same as NIFTY)
  calculateStockTargets(classicR1: number, classicR2: number) {
    return this.calculateNiftyTargets(classicR1, classicR2);
  }

  calculatePivotPoints() {
    const open = parseFloat(this.calculatorForm.get('open')?.value) || 0;
    const high = parseFloat(this.calculatorForm.get('high')?.value) || 0;
    const low = parseFloat(this.calculatorForm.get('low')?.value) || 0;
    const last = parseFloat(this.calculatorForm.get('last')?.value) || 0;

    if (this.selectedSegment === 'nifty') {
      // NIFTY-specific calculations using Camarilla for Entry/Stop Loss and Classic for Targets
      
      // Calculate Camarilla pivot points for Entry/Stop Loss
      const camarilla = this.calculateCamarillaPivotPoints(high, low, last);
      
      // Calculate Entry Point and Stop Loss
      const { entryPoint, stopLoss } = this.calculateNiftyEntryStopLoss(
        camarilla.pp,
        camarilla.r1,
        camarilla.s1
      );
      
      // Calculate Classic pivot points for Targets
      const classic = this.calculateClassicPivotPoints(high, low, last);
      
      // Calculate Targets
      const targets = this.calculateNiftyTargets(classic.r1, classic.r2);
      
      // Set NIFTY results
      this.pivotResults.entryPoint = entryPoint;
      this.pivotResults.stopLoss = stopLoss;
      this.pivotResults.targetOne = targets.targetOne;
      this.pivotResults.targetTwo = targets.targetTwo;
      this.pivotResults.targetThree = targets.targetThree;
      this.pivotResults.targetFour = targets.targetFour;
      this.pivotResults.targetFive = targets.targetFive;
    } else if (this.selectedSegment === 'stock') {
      // Stock Options: Camarilla for Entry, Classic for Stop Loss and Targets
      
      // Calculate Camarilla pivot points for Entry Point
      const camarilla = this.calculateCamarillaPivotPoints(high, low, last);
      
      // Calculate Classic pivot points for Stop Loss and Targets
      const classic = this.calculateClassicPivotPoints(high, low, last);
      
      // Calculate Entry Point (Camarilla)
      const entryPoint = this.calculateStockEntryPoint(camarilla.pp, camarilla.r1);
      
      // Calculate Stop Loss (Classic)
      const stopLoss = this.calculateStockStopLoss(classic.pp, classic.r1);
      
      // Calculate Targets (Classic, same as NIFTY)
      const targets = this.calculateStockTargets(classic.r1, classic.r2);
      
      // Set Stock results
      this.pivotResults.entryPoint = entryPoint;
      this.pivotResults.stopLoss = stopLoss;
      this.pivotResults.targetOne = targets.targetOne;
      this.pivotResults.targetTwo = targets.targetTwo;
      this.pivotResults.targetThree = targets.targetThree;
      this.pivotResults.targetFour = targets.targetFour;
      this.pivotResults.targetFive = targets.targetFive;
    }
  }

  onViewMagic() {
    if (this.calculatorForm.valid) {
      const values = this.calculatorForm.value;
      console.log('View Magic clicked with values:', values);
      
      // Calculate pivot points
      this.calculatePivotPoints();
      
      // Show results
      this.showResults = true;
      
      // Smooth scroll to results after a short delay
      setTimeout(() => {
        const resultsElement = document.querySelector('.results-section');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }

  navigateToNotifications() {
    this.router.navigate(['/notifications']);
  }

  navigateToBlocked() {
    this.router.navigate(['/blocked']);
  }
}
