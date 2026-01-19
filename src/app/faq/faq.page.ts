import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'courses' | 'subscription' | 'technical' | 'support';
  icon: string;
}

@Component({
  selector: 'app-faq',
  templateUrl: './faq.page.html',
  styleUrls: ['./faq.page.scss'],
  standalone: false,
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class FaqPage implements OnInit {
  selectedCategory: string = 'all';
  expandedItems: Set<string> = new Set();

  faqs: FAQ[] = [
    {
      id: '1',
      category: 'general',
      question: 'What is MoneyCraft Trader?',
      answer: 'MoneyCraft Trader is a comprehensive stock market trading education platform that helps you master the art of trading. We offer expert-led courses, proven strategies, and real-world insights to transform your financial future. With over 10,000+ students and a 95% success rate, we provide the knowledge and tools you need to succeed in the stock market.',
      icon: 'information-circle-outline'
    },
    {
      id: '2',
      category: 'general',
      question: 'Who can benefit from MoneyCraft Trader courses?',
      answer: 'Our courses are designed for traders of all levels - from complete beginners who are just starting their trading journey to experienced traders looking to refine their strategies. Whether you want to learn the basics or master advanced trading techniques, our expert-led sessions cater to everyone.',
      icon: 'people-outline'
    },
    {
      id: '3',
      category: 'courses',
      question: 'What courses do you offer?',
      answer: 'We offer comprehensive trading courses covering various aspects of stock market trading including technical analysis, fundamental analysis, risk management, options trading, and more. Our courses are structured to provide both theoretical knowledge and practical, hands-on experience through live trading sessions.',
      icon: 'book-outline'
    },
    {
      id: '4',
      category: 'courses',
      question: 'How many live trading sessions are included?',
      answer: 'We conduct over 500+ live trading sessions where you can watch and learn from expert mentors in real-time. These sessions provide practical insights and help you understand how to apply trading strategies in actual market conditions.',
      icon: 'videocam-outline'
    },
    {
      id: '5',
      category: 'courses',
      question: 'Who are the mentors?',
      answer: 'Our courses are led by Wall Street professionals and expert traders with decades of trading experience. We have 50+ expert mentors who bring real-world insights and proven strategies to help you succeed in the stock market.',
      icon: 'school-outline'
    },
    {
      id: '6',
      category: 'courses',
      question: 'What are the class timings?',
      answer: 'We offer flexible timings to suit your schedule:\n\n• Monday to Friday: 12:00 PM - 2:00 PM IST and 8:00 PM - 10:00 PM IST\n• Saturday & Sunday: 12:00 PM - 4:00 PM IST\n\nYou can choose the batch that works best for you.',
      icon: 'time-outline'
    },
    {
      id: '7',
      category: 'subscription',
      question: 'What subscription plans are available?',
      answer: 'We offer flexible subscription plans:\n\n• 1 Month Plan - Perfect for trying out our premium features\n• 3 Months Plan - Great value for short-term projects (Most Popular)\n• 6 Months Plan - Best for long-term commitment\n• 1 Year Plan - Maximum savings and benefits (Premium)\n\nEach plan includes access to all courses, live trading sessions, and expert mentorship.',
      icon: 'card-outline'
    },
    {
      id: '8',
      category: 'subscription',
      question: 'What features are included in the subscription?',
      answer: 'With your subscription, you get:\n\n• Access to all premium courses\n• Unlimited formula generation\n• Priority customer support\n• Advanced analytics dashboard\n• Export to multiple formats\n• Ad-free experience\n• Early access to new features\n• API access (for higher plans)\n• Custom integrations and white-label options (for annual plans)',
      icon: 'star-outline'
    },
    {
      id: '9',
      category: 'subscription',
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription at any time. However, you will continue to have access to all features until the end of your current billing period. For cancellation policy details, please refer to our Cancellation Policy page or contact our support team.',
      icon: 'close-circle-outline'
    },
    {
      id: '10',
      category: 'technical',
      question: 'What is the Magic Formula calculator?',
      answer: 'The Magic Formula calculator is a powerful tool that helps you calculate pivot points for NIFTY Options and Stock Options. It provides entry points, stop loss levels, and multiple target points based on your input values (Open, High, Low, Last). This tool is designed to help you make informed trading decisions.',
      icon: 'calculator-outline'
    },
    {
      id: '11',
      category: 'technical',
      question: 'How do I use the pivot point calculator?',
      answer: 'Using the calculator is simple:\n\n1. Select your segment (NIFTY Options or Stock Options)\n2. Enter the Open, High, Low, and Last values\n3. Click "View Magic" to calculate\n4. Review your Entry Point, Stop Loss, and Target levels\n\nThe calculator uses proven pivot point formulas to provide accurate trading levels.',
      icon: 'help-circle-outline'
    },
    {
      id: '12',
      category: 'technical',
      question: 'Can I access the app on multiple devices?',
      answer: 'Yes, you can access your account on multiple devices. However, for security reasons, you may need to request a device change if you want to switch to a new device. Use the "Request Device Change" feature in your profile settings, and our admin team will process your request within 24 hours.',
      icon: 'phone-portrait-outline'
    },
    {
      id: '13',
      category: 'support',
      question: 'How can I contact support?',
      answer: 'You can reach our support team through:\n\n• Email: support@moneycrafttrader.com\n• Phone: +91 74992 40812\n• In-app support: Use the Support section in the menu\n\nOur support team is available to help you with any questions or issues you may have.',
      icon: 'mail-outline'
    },
    {
      id: '14',
      category: 'support',
      question: 'What is your success rate?',
      answer: 'We are proud to have a 95% success rate among our students. This means that 95% of our students have successfully learned and applied trading strategies to improve their trading performance. Our comprehensive approach combining expert knowledge, practical experience, and proven strategies contributes to this high success rate.',
      icon: 'trophy-outline'
    },
    {
      id: '15',
      category: 'general',
      question: 'Where is MoneyCraft Trader located?',
      answer: 'MoneyCraft Trader is based in Pune, Maharashtra, India. However, our online courses and platform are accessible from anywhere in the world, allowing you to learn at your own pace and convenience.',
      icon: 'location-outline'
    },
    {
      id: '16',
      category: 'courses',
      question: 'Do you offer risk management training?',
      answer: 'Yes, risk management is a core component of our courses. We teach proven strategies to protect your capital and maximize returns. Our expert mentors emphasize the importance of proper risk management techniques, position sizing, and stop-loss strategies to help you trade safely and profitably.',
      icon: 'shield-checkmark-outline'
    },
    {
      id: '17',
      category: 'subscription',
      question: 'Are there any discounts or offers available?',
      answer: 'We regularly offer special discounts and promotional offers, especially for annual subscriptions. Keep an eye on your notifications for the latest offers. You can also check our subscription page to see current pricing and any available savings.',
      icon: 'gift-outline'
    },
    {
      id: '18',
      category: 'technical',
      question: 'How do I update my profile information?',
      answer: 'You can update your profile information by:\n\n1. Going to "View Profile" in the menu\n2. Clicking "Edit Profile"\n3. Updating your details (Full Name, Email, Mobile Number, Date of Birth)\n4. Saving your changes\n\nNote: Your mobile number is required for login via WhatsApp.',
      icon: 'person-outline'
    }
  ];

  categories = [
    { id: 'all', label: 'All Questions', icon: 'list-outline' },
    { id: 'general', label: 'General', icon: 'information-circle-outline' },
    { id: 'courses', label: 'Courses', icon: 'book-outline' },
    { id: 'subscription', label: 'Subscription', icon: 'card-outline' },
    { id: 'technical', label: 'Technical', icon: 'settings-outline' },
    { id: 'support', label: 'Support', icon: 'help-circle-outline' }
  ];

  constructor() { }

  ngOnInit() {
  }

  getFilteredFAQs(): FAQ[] {
    if (this.selectedCategory === 'all') {
      return this.faqs;
    }
    return this.faqs.filter(faq => faq.category === this.selectedCategory);
  }

  toggleItem(id: string) {
    if (this.expandedItems.has(id)) {
      this.expandedItems.delete(id);
    } else {
      this.expandedItems.add(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedItems.has(id);
  }

  trackByFaqId(index: number, faq: FAQ): string {
    return faq.id;
  }
}
