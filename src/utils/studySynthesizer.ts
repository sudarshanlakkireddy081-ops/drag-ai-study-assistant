import { DocumentMetadata, MCQQuiz, Flashcard, RevisionChecklist } from '../types';

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const OS_CLIENT_MCQS = [
  {
    question: 'Which of the following is NOT one of the three required conditions for solving the Critical Section problem?',
    options: ['Mutual Exclusion', 'Bounded Waiting', 'Preemptive Scheduling', 'Progress'],
    correctIndex: 2,
    explanation: 'The three required conditions are Mutual Exclusion, Progress, and Bounded Waiting [Page 1].',
    pageReference: 1,
  },
  {
    question: 'What is a Race Condition in concurrent programming?',
    options: [
      'Threads executing on different clock frequencies',
      'Concurrent processes accessing shared data where the outcome depends on execution timing',
      'The CPU frequency scaling down due to overheating',
      'A deadlock state where threads wait on empty queues'
    ],
    correctIndex: 1,
    explanation: 'A race condition occurs when outcome depends on the non-deterministic interleaving of instructions [Page 1].',
    pageReference: 1,
  },
  {
    question: 'In a counting semaphore, what happens when wait() is called and S.value <= 0?',
    options: [
      'An unhandled exception is thrown',
      'The calling thread blocks and sleeps on the semaphore waiting queue',
      'The thread continues in a busy-waiting spinlock',
      'The semaphore resets to 1'
    ],
    correctIndex: 1,
    explanation: 'wait() decrements S.value and places the process in the waiting queue if S.value <= 0 [Page 2].',
    pageReference: 2,
  },
  {
    question: 'What is the main benefit of a Spinlock over a blocking sleep-lock?',
    options: [
      'Spinlocks automatically prevent deadlocks',
      'Spinlocks avoid the CPU overhead of full context switches for brief locks',
      'Spinlocks do not use any memory',
      'Spinlocks guarantee starvation freedom'
    ],
    correctIndex: 1,
    explanation: 'Spinlocks avoid the 2-4 microsecond latency of thread context switches when lock times are brief [Page 2].',
    pageReference: 2,
  },
  {
    question: 'Which condition is NOT one of the four Coffman conditions necessary for Deadlock?',
    options: ['Hold and Wait', 'Circular Wait', 'Preemption by Timer', 'Mutual Exclusion'],
    correctIndex: 2,
    explanation: 'The four conditions are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait [Page 4].',
    pageReference: 4,
  },
  {
    question: 'In Dijkstra\'s Banker\'s Algorithm, how is the Need matrix calculated for process i and resource j?',
    options: [
      'Need[i][j] = Allocation[i][j] + Max[i][j]',
      'Need[i][j] = Max[i][j] - Allocation[i][j]',
      'Need[i][j] = Available[j] - Allocation[i][j]',
      'Need[i][j] = Max[i][j] / Available[j]'
    ],
    correctIndex: 1,
    explanation: 'Need[i][j] = Max[i][j] - Allocation[i][j] gives the remaining demand needed to complete [Page 5].',
    pageReference: 5,
  },
  {
    question: 'What is Belady\'s Anomaly in Virtual Memory?',
    options: [
      'Memory clock skew causing bit flips',
      'Adding more physical frames increasing the number of page faults (in FIFO)',
      'A page fault crashing the kernel',
      'LRU cache replacement underperforming random replacement'
    ],
    correctIndex: 1,
    explanation: 'In FIFO page replacement, allocating more physical frames can counter-intuitively increase page faults [Page 6].',
    pageReference: 6,
  },
];

export function synthesizeClientMCQs(
  doc: DocumentMetadata,
  count: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): MCQQuiz {
  if (doc.id === 'doc-os-concurrency-01' || doc.title.toLowerCase().includes('concurrency')) {
    const shuffled = shuffle(OS_CLIENT_MCQS).slice(0, Math.min(count, OS_CLIENT_MCQS.length));
    const questions = shuffled.map((q, idx) => {
      const correctOpt = q.options[q.correctIndex];
      const randomizedOptions = shuffle(q.options);
      return {
        id: `q-client-${Date.now()}-${idx + 1}`,
        question: q.question,
        options: randomizedOptions,
        correctIndex: randomizedOptions.indexOf(correctOpt),
        explanation: q.explanation,
        pageReference: q.pageReference,
      };
    });

    return {
      id: `quiz-client-${Date.now()}`,
      documentId: doc.id,
      documentTitle: doc.title,
      topic: 'Comprehensive Review',
      difficulty,
      questions,
      createdAt: new Date().toISOString(),
    };
  }

  // Dynamic synthesis from document pages
  const pages = doc.pages && doc.pages.length > 0 ? doc.pages : [{ pageNumber: 1, text: doc.title, sectionTitle: 'Overview' }];
  const questions: any[] = [];

  for (let i = 0; i < Math.min(count, Math.max(pages.length, 3)); i++) {
    const page = pages[i % pages.length];
    const sentences = (page.text || '')
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 30 && s.length <= 200);

    const targetSentence = sentences[0] || `Section ${page.sectionTitle || page.pageNumber} covers core principles of ${doc.title}.`;
    const cleanConcept = page.sectionTitle || `Concept on Page ${page.pageNumber}`;

    const correctOpt = targetSentence.length > 100 ? targetSentence.slice(0, 95) + '...' : targetSentence;
    const distractorA = `It is completely ignored in modern systems to optimize execution speed.`;
    const distractorB = `It only functions when no other concurrent processes are active.`;
    const distractorC = `It replaces the need for any physical or virtual memory allocation.`;

    const options = shuffle([correctOpt, distractorA, distractorB, distractorC]);

    questions.push({
      id: `q-dyn-${Date.now()}-${i + 1}`,
      question: `According to Page ${page.pageNumber}, which statement accurately defines ${cleanConcept}?`,
      options,
      correctIndex: options.indexOf(correctOpt),
      explanation: `According to [Page ${page.pageNumber}]: "${targetSentence.slice(0, 140)}..."`,
      pageReference: page.pageNumber,
    });
  }

  return {
    id: `quiz-client-${Date.now()}`,
    documentId: doc.id,
    documentTitle: doc.title,
    topic: 'Comprehensive Exam Drill',
    difficulty,
    questions,
    createdAt: new Date().toISOString(),
  };
}

export function synthesizeClientFlashcards(
  doc: DocumentMetadata,
  count: number = 6
): Flashcard[] {
  const pages = doc.pages && doc.pages.length > 0 ? doc.pages : [{ pageNumber: 1, text: doc.title, sectionTitle: 'Overview' }];
  const cards: Flashcard[] = [];

  pages.slice(0, count).forEach((page, idx) => {
    const sentences = (page.text || '')
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.length > 25);

    const title = page.sectionTitle || `Topic Page ${page.pageNumber}`;
    cards.push({
      id: `fc-client-${idx + 1}`,
      documentId: doc.id,
      front: `What is the core takeaway regarding ${title} [Page ${page.pageNumber}]?`,
      back: `${sentences[0] || 'Core principles covered in this section.'}\n\n• Key Point: ${sentences[1] || 'Review carefully for exams.'}`,
      pageReference: page.pageNumber,
      chapterOrTopic: title,
    });
  });

  return cards;
}
