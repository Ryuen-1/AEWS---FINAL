### **4.1.2 Web System Design and Workflow Integration (Objective 2)**

The implementation of Objective 2 focused on the development of a secure, role-based web platform designed to facilitate the secure handling of sensitive academic, attendance, and psychosocial data. The system architecture utilizes a layered approach comprising a React and Vite frontend, a FastAPI backend, and a MongoDB database, integrated with an email notification service. To ensure the integrity of the data, the backend enforces authorization at the API level, preventing the frontend from being the sole arbiter of access privileges.

The system implements role-based access control at the backend level to limit users to functions and records appropriate to their institutional responsibilities. This access-control design supports the principle of least privilege by separating the workflows of instructors, AMU staff, administrators, and students. Each role is provided with system functions that correspond to its responsibilities in academic monitoring, referral handling, needs-assessment management, student support, or system administration.

| User Role | Primary Responsibilities |
| ----- | ----- |
| **Instructors** | Manage class rosters, upload gradesheets and attendance and review academic indicators. |
| **AMU Staff** | Review assigned referrals, manage needs-assessment invitations, analyze student data, and document support-routing decisions. |
| **Administrators** | Manage user accounts, configure needs-assessment forms, review analytics, and monitor system activity logs. |
| **Students** | Access personal dashboards, view academic progress/notifications, and complete assigned needs assessments. |

System access is secured through authenticated bearer tokens with refresh-token support to maintain session continuity without requiring frequent re-authentication. Security mechanisms include password hashing, email verification, role validation, and administrator approval for relevant user accounts. Login and signup endpoints are protected by API rate limiting to reduce brute-force and account-abuse risks. The system also uses environment-configured authentication secrets instead of hard-coded values, improving protection against unauthorized access.

The system protects sensitive student information through controlled backend routes and role-based API authorization. Needs-assessment information is collected through tokenized invitations, allowing students to submit assigned forms while preventing general public access to referral records. The backend also applies input validation and file-upload constraints, including limits on file size and accepted formats such as CSV, Excel, and Word documents, to reduce risks related to invalid, corrupted, or malicious uploads.

The platform streamlines the academic monitoring and AMU referral workflow by connecting instructor-managed class records, grade and attendance processing, student risk indicators, referral status, needs-assessment responses, AMU review, support-routing decisions, notifications, and reports within one system. It provides data-driven decision support without replacing human judgment. Prediction results and referral indicators serve as aids for authorized personnel, while instructors, administrators, and AMU staff remain responsible for reviewing each case and determining the appropriate support action.

Accountability is supported through centralized activity logging, which records key system actions such as account management, referral updates, prediction requests, needs-assessment handling, and other administrative activities. Centralized error handling also helps prevent internal implementation details from being exposed to end-users. Notifications and email-related processes support timely communication among users, students, and AMU personnel, strengthening the reliability and responsiveness of the referral workflow.

While the system is designed to align with principles of data privacy, transparency, role-based access, and data minimization, this represents implementation-level alignment rather than a formal declaration of legal compliance. Final institutional deployment would require review by the university Data Protection Officer or authorized institutional body, particularly regarding privacy notices, consent handling, data-retention schedules, user accountability, and breach-response procedures.

### **4.1.3 Early Warning Analytics and XGBoost Model Integration (Objective 3)**

The implementation of Objective 3 focused on developing the early warning analytics component of the Academic Early Warning System through the integration of an XGBoost-based prediction model. This objective aimed to enable the system to detect students who may be academically at risk and provide early warning information that can support instructor review, AMU referral processing, and student-support decisions.

The implemented prediction model uses structured academic, attendance, and needs-assessment data available through the AEWS workflow. The deployed model accepts nine core features: previous GPA, failed subject count, attendance rate, academic challenge score, external factor score, midterm grade, class standing, laboratory grade, and major output grade. These features were selected because they can be extracted from uploaded gradesheets, attendance records, and needs-assessment responses without requiring live integration with external LMS or SIS platforms.

The XGBoost model classifies students into two academic risk categories. Students with final grades from 1.00 to 2.25 are labeled as Low Risk, while students with final grades from 2.50 to 5.00 are labeled as High Risk. This labeling rule follows the BukSU grading scale, where higher numerical grades indicate weaker academic performance. By using this binary classification structure, the model supports early identification of students who may require academic monitoring, referral, or additional support.

Before prediction, the system prepares student records through preprocessing steps such as identifier matching, data cleaning, numeric conversion, missing value handling, and normalization. Attendance values are converted into a consistent percentage format, grade values are interpreted according to the BukSU 1.00 to 5.00 grading scale, and needs-assessment responses are summarized into academic challenge and external factor scores. These steps ensure that the data supplied to the model is consistent with the structure used during model training and evaluation.

The model was integrated into the AEWS as a decision-support component rather than as an automatic decision-maker. In the system workflow, prediction results are displayed together with supporting indicators such as academic performance, attendance status, grade component weaknesses, referral details, and needs-assessment factors. This allows instructors, administrators, and AMU staff to review the prediction in context before deciding on the appropriate support action.

The deployed system also includes safeguards for incomplete student data. When a student record does not contain enough information for reliable prediction, the system returns an insufficient-data status rather than forcing a risk classification. This behavior supports responsible use of the predictive model by ensuring that predictions are generated only when enough academic, attendance, or needs-assessment indicators are available.

Model interpretability was supported through SHAP-based analysis during evaluation and through contributing indicators in the deployed system. The SHAP analysis helped identify which input variables had greater influence on the trained model, while the deployed AEWS presents user-readable explanation factors such as previous GPA, failed subject count, attendance rate, midterm grade, grade components, academic challenge score, and external factor score. These outputs help users understand the possible basis of the prediction while maintaining human judgment in referral and support decisions.

Overall, the results show that Objective 3 was achieved through the successful integration of an XGBoost-based early warning analytics component into the AEWS. The system was able to generate risk classifications and present them with supporting indicators that can assist authorized personnel in academic monitoring, referral evaluation, and support-routing decisions.

### **4.1.4 Predictive Performance Evaluation (Objective 4)**

The implementation of Objective 4 focused on testing the predictive performance of the XGBoost student-risk model using standard classification metrics. This evaluation determined whether the trained model could classify students into Low Risk and High Risk categories with acceptable accuracy and reliability based on the available institutional and needs-assessment dataset.

The saved model evaluation results showed strong predictive performance. The selected student-risk model achieved a holdout accuracy of 97.5%. It also recorded a weighted precision of 0.975, weighted recall of 0.975, and weighted F1-score of 0.975. These results indicate that the model was able to classify student risk consistently using the available structured dataset.

| Evaluation Metric | Result |
| :---- | :---- |
| Holdout Accuracy | 97.5% |
| Weighted Precision | 0.975 |
| Weighted Recall | 0.975 |
| Weighted F1-score | 0.975 |
| Model Type | XGBoost Classification Model |
| Training Records | 1,000 student records |
| Risk Labels | Low Risk and High Risk |

**Table 4-3.** Predictive Performance of the XGBoost Student-Risk Model

The weighted precision value of 0.975 indicates that the model produced highly reliable classifications across the risk categories. This means that most students identified under a risk category were correctly classified based on the evaluation dataset. The weighted recall value of 0.975 shows that the model was also effective in identifying students who belonged to the correct risk class, reducing the likelihood that students needing support would be missed. The weighted F1-score of 0.975 demonstrates a strong balance between precision and recall, which is important in an early warning system where both accurate alerts and complete detection are necessary.

Overall, Objective 4 was achieved because the XGBoost student-risk model demonstrated high predictive performance across the selected evaluation metrics. The accuracy, precision, recall, and F1-score results support the suitability of the model as a predictive component for the AEWS, while still requiring human review before any academic intervention or support-routing decision is finalized.

### **4.1.5 Software Usability and Institutional Evaluation (Objective 5)**
