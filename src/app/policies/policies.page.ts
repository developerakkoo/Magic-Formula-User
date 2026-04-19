import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

interface Policy {
  id: string;
  title: string;
  content: string;
  icon: string;
}

@Component({
  selector: 'app-policies',
  templateUrl: './policies.page.html',
  styleUrls: ['./policies.page.scss'],
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
export class PoliciesPage implements OnInit {
  expandedItems: Set<string> = new Set();

  policies: Policy[] = [
    {
      id: 'privacy',
      title: 'Privacy Policy & No Refund Policy',
      icon: 'shield-checkmark-outline',
      content: `Effective Date: December 2024

Welcome to Money Craft Trader ("Company", "we", "us", or "our"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, store, and protect your data when you use our website, attend our courses (online/offline), or interact with us in any form.

By accessing or using any of our services, you agree to the terms outlined in this Privacy Policy and our No Refund Policy.

1. Information We Collect
We collect personal and transactional information that you provide to us, including but not limited to:

• Full Name
• Email Address
• Mobile Number
• Location (for offline sessions)
• Payment Details (only via secure gateways, never stored by us)
• Device and browsing information (via cookies)

2. How We Use Your Information
Your information is used strictly for:

• Providing course access and study material
• Communicating updates or important notices
• Offering customer support
• Sending transactional and course-related WhatsApp/email/SMS messages
• Internal analytics to improve our offerings

3. Data Protection
We implement industry-standard measures to secure your data:

• Encrypted storage (where applicable)
• Secure payment gateways (e.g., Razorpay, Google Pay, etc.)
• Limited access to sensitive data internally
• No resale or third-party sharing of personal data

4. Third-Party Services
We may use trusted third-party tools (e.g., Zoom, Google Drive, WhatsApp API, payment gateways) to deliver services. These platforms may have their own privacy policies. We are not responsible for their practices.

5. No Refund Policy
All payments made to Money Craft Trader are non-refundable under any circumstances.

This includes, but is not limited to:

• Course cancellations by the participant
• Change of mind
• Unavailability or scheduling conflicts
• Technical issues on the user's end
• Failure to attend live/offline sessions

By enrolling and making payment, you agree and acknowledge this No Refund Policy unconditionally.

6. Disclaimer & Limitation of Liability
Our courses are for educational purposes only and are not financial advice.
We do not guarantee profits, returns, or success in the stock market.
Any decision made based on our content is the responsibility of the user.
We are not liable for any loss, damage, or legal issue arising from the use of our material.
Defamation, misuse of our content, or misrepresentation of our brand is strictly prohibited and may attract legal action.

7. User Consent
By accessing our website, joining our classes (online or offline), or engaging in any communication with us, you consent to this Privacy Policy and the No Refund terms.

8. Updates to This Policy
We reserve the right to update or modify this policy at any time. Updates will be posted on this page with the revised date.

9. Contact Information
If you have questions or concerns about this Privacy Policy or our practices, please contact:

📧 Email: support@moneycrafttrader.com
📞 Phone: +91 98765 43210
🏢 Office: Pune, Maharashtra, India`
    },
    {
      id: 'terms',
      title: 'Terms & Conditions',
      icon: 'document-text-outline',
      content: `Effective Date: December 2024

Welcome to Money Craft Trader ("Company", "we", "us", "our"). These Terms & Conditions ("Terms") govern your access to and use of our services, including our website, courses, content, communication channels (such as WhatsApp, Telegram), and offline/online programs.

By accessing or using any part of our services, you agree to be bound by these Terms. If you do not agree, please do not use our services.

1. Eligibility
• You must be at least 18 years old or have parental consent to use our services.
• You are responsible for ensuring that your use of our services complies with all laws and regulations applicable to you.

2. Educational Purpose Only
All content provided by Money Craft Trader is strictly for educational and informational purposes.
We do not provide financial, investment, or legal advice.
Users are responsible for their own investment decisions.

3. Payment Terms
• All payments made to Money Craft Trader are final and non-refundable.
• Your registration is confirmed only upon successful payment.
• We reserve the right to modify course pricing at any time.

4. No Refund Policy
By enrolling in any course, you explicitly agree that no refund requests will be entertained under any circumstance.
Refer to our Privacy Policy & No Refund Policy for more details.

5. Intellectual Property
All materials including but not limited to videos, slides, PDFs, live sessions, and recordings are the intellectual property of Money Craft Trader.
You may not record, distribute, duplicate, or share any part of our course content without written permission.
Any unauthorized sharing or commercial use of our material is a legal violation.

6. Code of Conduct
You agree to:

• Behave respectfully in all sessions and groups
• Not abuse, harass, or spam instructors or students
• Not misuse, misrepresent, or defame our brand in any form
• Avoid promoting external products/services in our communities

Violation of this may result in immediate removal from the course and community, with no refund.

7. Limitation of Liability
We make no guarantees regarding results, performance, or earnings through stock market participation.
We are not liable for any loss, damage, or consequence arising directly or indirectly from the use of our courses.
All responsibility for applying any strategy, technique, or information lies with the user.

8. Course Access & Expiry
Access to course content (recordings, materials) is valid only for the duration communicated during enrollment.
We reserve the right to modify or discontinue any part of the course at any time.

9. Termination
We reserve the right to terminate access to any user who violates these Terms, without refund or prior notice.

10. Amendments
We may update these Terms at any time. Continued use of our services after changes means you agree to the updated Terms.

11. Governing Law & Jurisdiction
These Terms shall be governed by and interpreted under the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts located in Pune, Maharashtra, India.

12. Contact Information
📧 Email: support@moneycrafttrader.com
📞 Phone: +91 74992 40812
🏢 Office Address: Pune, Maharashtra, India`
    },
    {
      id: 'cancellation',
      title: 'Cancellation & Refund Policy',
      icon: 'close-circle-outline',
      content: `Effective Date: December 2024

At Money Craft Trader, we provide educational services, including online and offline stock market training programs. Once a student enrolls and makes the payment, the fee is non-refundable and non-transferable under any circumstances.

Important Notice
We request students to carefully review course details, schedules, and fee structures before enrollment.

• All course fees are non-refundable once payment is made
• Course access cannot be transferred to another person
• No exceptions will be made for any reason

Payment Gateway Issues
In case of payment gateway errors (such as payment failure with deduction), please contact us immediately.

📧 Email: support@moneycrafttrader.com
📞 Phone: +91 7499240812

We will work with our payment partner to resolve the issue and ensure you receive the appropriate resolution.

Policy Summary
• All payments are final and non-refundable
• Course access cannot be transferred to another person
• No refunds for change of mind or scheduling conflicts
• Payment gateway issues will be resolved with our support team`
    },
    {
      id: 'shipping',
      title: 'Shipping Policy',
      icon: 'cube-outline',
      content: `Effective Date: December 2024

Service-Based Educational Program
At Money Craft Trader, we provide training and educational services in stock market learning through both online and offline classes. Since our product is a service-based educational program and not a physical item, there is no physical shipping or delivery involved.

How Access is Delivered

Online Students
Once your enrollment and payment are confirmed, login credentials to our LMS portal are provided within 24 hours.

Offline Students
After enrollment, you will receive a confirmation message with your batch details, classroom address, and start date.

Important Notes
• No shipping charges apply, as we do not dispatch any physical goods.
• All course materials, recordings, and resources are delivered digitally via our portal.
• Any study materials provided in offline classes are handed over directly to the student at the training center.

Contact Information
If you have any questions, please contact us at:

📧 support@moneycrafttrader.com
📞 +91 7499240812`
    }
  ];

  constructor() { }

  ngOnInit() {
  }

  togglePolicy(id: string) {
    if (this.expandedItems.has(id)) {
      this.expandedItems.delete(id);
    } else {
      this.expandedItems.add(id);
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedItems.has(id);
  }

  trackByPolicyId(index: number, policy: Policy): string {
    return policy.id;
  }
}

