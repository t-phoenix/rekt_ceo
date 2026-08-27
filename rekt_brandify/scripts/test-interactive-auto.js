import inquirer from 'inquirer';
import path from 'path';
import { fileURLToPath } from 'url';

// Mock inquirer to automatically answer prompts
inquirer.prompt = async (questions) => {
  const answers = {};
  for (const q of questions) {
    if (q.name === 'customTarget') {
      answers[q.name] = 'the background sky';
      console.log(`🤖 [AUTO-TEST] Chose custom target: ${answers[q.name]}`);
    } else if (q.name === 'selectedElements') {
      const choices = typeof q.choices === 'function' ? q.choices({}) : q.choices;
      // Creative Director picks all "new" elements and the first "existing" element for max impact
      const optimumElements = choices.filter(c => c.value && (c.value.type === 'new' || choices.indexOf(c) === 0));
      answers[q.name] = optimumElements.map(c => c.value);
      console.log(`🤖 [AUTO-TEST Creative Director] Chose elements: ${answers[q.name].map(e => e.name).join(', ')}`);
    } else if (q.name === 'chosenIdea') {
      const choices = typeof q.choices === 'function' ? q.choices({}) : q.choices;
      // Occasionally pick 'custom' if it's a specific element, otherwise pick the second idea (often more creative than the first)
      if (Math.random() > 0.5) {
         answers[q.name] = 'custom';
         console.log(`🤖 [AUTO-TEST Creative Director] Decided to write a custom idea!`);
      } else {
         answers[q.name] = choices[1] ? choices[1].value : choices[0].value;
         console.log(`🤖 [AUTO-TEST Creative Director] Chose idea: ${answers[q.name]}`);
      }
    } else if (q.name === 'customIdea') {
      answers[q.name] = "Make it extremely high-fashion with vibrant Rekt Red and CEO Yellow neon accents, ensuring it looks like a premium streetwear editorial.";
      console.log(`🤖 [AUTO-TEST Creative Director] Wrote custom idea: ${answers[q.name]}`);
    } else if (q.name === 'rating') {
      answers[q.name] = '👍 Like';
      console.log(`🤖 [AUTO-TEST] Chose rating: 👍 Like`);
    }
  }
  return answers;
};

// Now import the interactive script to run it
console.log('🤖 [AUTO-TEST] Running brandify-interactive.js with automated selections...\n');
await import('./brandify-interactive.js');
