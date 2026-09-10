# Test ShikshaSetu API Endpoints

## Prerequisites
```bash
# Start the dev server
pnpm dev

# Make sure .env has:
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key  # optional fallback
```

## 1. Test Assessment Generation

```bash
# First, sign up and get a Firebase ID token
# Then:

curl -X POST http://localhost:8080/api/assessment/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "roleId": "role-id-from-firestore",
    "careerTarget": "AI / ML Engineer"
  }'

# Expected response:
{
  "questions": [
    {
      "id": 1,
      "skillName": "Python",
      "question": "Explain the difference between...",
      "difficulty": "intermediate",
      "expectedConcepts": ["concept1", "concept2"]
    },
    ...
  ]
}
```

## 2. Test Assessment Evaluation

```bash
curl -X POST http://localhost:8080/api/assessment/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "studentId": "your-student-id",
    "roleId": "role-id",
    "careerTarget": "AI / ML Engineer",
    "answers": [
      {
        "questionId": 1,
        "skillName": "Python",
        "question": "What is...",
        "answer": "Python is...",
        "difficulty": "beginner"
      }
    ]
  }'

# Expected response:
{
  "success": true,
  "readinessScore": 65,
  "skills": [
    {
      "skillName": "Python",
      "category": "Programming",
      "proficiency": 70,
      "confidence": 75,
      "status": "in_progress",
      "gaps": ["Error handling"],
      "strengths": ["Basic syntax", "Data structures"]
    }
  ]
}

# This also writes to Firestore:
# - students/{id}/skillProfiles/{skillId}
# - students/{id}/skillProfiles/{skillId}/evidence/{evidenceId}
# - Updates student readinessScore
```

## 3. Test Roadmap Generation

```bash
curl -X POST http://localhost:8080/api/roadmap/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "studentId": "your-student-id"
  }'

# Expected response:
{
  "success": true,
  "roadmapId": "active"
}

# Writes to Firestore:
# students/{id}/roadmaps/active
#   - nodes: [...] 
#   - edges: [...]
#   - status: 'active'
```

## 4. Check Firestore Data

After running tests, check Firestore Console:

### students collection
```
students/{uid}/
  ├─ displayName: "Test Student"
  ├─ readinessScore: 65
  ├─ careerTarget: "AI / ML Engineer"
  ├─ careerTargetId: "role-id"
  └─ (subcollections)
      ├─ skillProfiles/
      │   ├─ python/
      │   │   ├─ proficiency: 70
      │   │   ├─ confidence: 75
      │   │   ├─ status: "in_progress"
      │   │   └─ (subcollections)
      │   │       └─ evidence/
      │   │           └─ {evidenceId}/
      │   │               ├─ type: "assessment_result"
      │   │               ├─ score: 70
      │   │               └─ verificationStatus: "verified"
      │   └─ machine-learning/
      │       └─ ...
      └─ roadmaps/
          └─ active/
              ├─ nodes: [...]
              ├─ edges: [...]
              ├─ targetRole: "AI / ML Engineer"
              └─ status: "active"
```

## 5. Test Matching (In Code)

```typescript
// In your component or test file
import { calculateMatch } from '@/services/matching.service';
import { getStudentByUserId, getStudentSkillDNA } from '@/services/student.service';
import { getOpportunities } from '@/services/opportunity.service';

async function testMatching() {
  // Get data
  const student = await getStudentByUserId('firebase-uid');
  const skillProfiles = await getStudentSkillDNA(student.id);
  const opportunities = await getOpportunities({ status: 'active' });
  
  // Calculate match for first opportunity
  const opportunity = opportunities[0];
  const matchResult = calculateMatch(student, skillProfiles, opportunity);
  
  console.log('Match Score:', matchResult.overallScore);
  console.log('Skill Score:', matchResult.components.skillScore);
  console.log('Evidence Score:', matchResult.components.evidenceScore);
  console.log('Eligibility:', matchResult.components.eligibilityScore);
  
  console.log('Matched Skills:', matchResult.matched);
  console.log('Missing Skills:', matchResult.missing);
  console.log('Reasons:', matchResult.components.reasons);
  
  // All scores and reasons are deterministic and explainable
}
```

## 6. Test Other AI Endpoints

### Extract Skills from Text
```bash
curl -X POST http://localhost:8080/api/ai/extract-skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "text": "Built a machine learning model using Python and TensorFlow..."
  }'
```

### Analyze Skill Gaps
```bash
curl -X POST http://localhost:8080/api/ai/analyze-gaps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "gaps": [
      {
        "skillName": "Docker",
        "currentLevel": 30,
        "requiredLevel": 75,
        "severity": "high"
      }
    ]
  }'
```

### Explain Match
```bash
curl -X POST http://localhost:8080/api/ai/explain-match \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "matchScore": 85,
    "matchedSkills": [...],
    "missingSkills": [...],
    "reasons": [...]
  }'
```

## 7. Frontend Testing Flow

### Complete User Journey:
1. Go to http://localhost:8080/signup
2. Create account with email (or Google)
3. Select "Student" role
4. Go to /assessment
5. Select "AI / ML Engineer" role
6. Answer the generated questions
7. Submit assessment
8. See results with skill breakdown
9. Click "Generate Roadmap" (if implemented)
10. Go to /app to see dashboard
11. Check skill readiness score (should be 0-100)
12. View roadmap nodes (if Index.tsx is fixed)
13. Go to /workspace to see opportunities
14. Check match scores (if matching is connected)

## 8. Verify Data Flow

```bash
# Check server logs for:
[AI] Gemini initialized
[AI] Question generation successful
[AI] Evaluation complete, writing to Firestore
[Roadmap] Generated for student: {id}

# Check Firebase Console:
- Authentication: User created ✓
- Firestore: students/{uid} exists ✓
- Firestore: skillProfiles subcollection has docs ✓
- Firestore: evidence subcollection has docs ✓
- Firestore: roadmaps/active exists ✓
```

## 9. Common Issues

### "AI service unavailable"
- Check GEMINI_API_KEY in .env
- Verify API key is valid
- Check Groq as fallback

### "UNAUTHENTICATED"
- Token expired, sign in again
- Token not in Authorization header
- Format: "Bearer {token}"

### "Student not found"
- User profile not created in Firestore
- Wrong studentId
- Profile not properly initialized

### No roadmap generated
- Assessment not completed first
- No career target set
- No skill profiles exist

## 10. Production Checklist

Before deploying:
- [ ] All .env variables set
- [ ] Firebase project configured
- [ ] Firestore indexes created
- [ ] Security rules deployed
- [ ] Assessment flow tested end-to-end
- [ ] Roadmap generation tested
- [ ] Matching calculations working
- [ ] Error handling verified
- [ ] Loading states working

## Quick Debug Commands

```bash
# Check if server is running
curl http://localhost:8080/api/ping

# Get Firebase token (from browser console)
firebase.auth().currentUser.getIdToken().then(console.log)

# Check Firestore directly (Firebase Console)
https://console.firebase.google.com/project/YOUR_PROJECT/firestore

# View logs
pnpm dev | grep -E "AI|Assessment|Roadmap"
```
