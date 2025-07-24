const express = require('express');
const app = express();
app.use(express.json());

// In-memory data store
const polls = new Map();
const votes = new Map(); // track user votes per poll

// Create poll
app.post('/polls', (req, res) => {
  const { poll_str_id, question, options } = req.body;
  const pollId = poll_str_id || Date.now().toString();
  
  if (polls.has(pollId)) 
    return res.status(409).json({ error: 'Poll already exists' });
  
  const poll = {
    poll_str_id: pollId,
    question,
    status: 'active',
    options: options.map((opt, i) => ({
      option_str_id: `${pollId}_option_${i + 1}`,
      text: opt.text,
      color: opt.fav_color_poll || '#000',
      votes: 0
    }))
  };
  
  polls.set(pollId, poll);
  votes.set(pollId, new Set());
  res.status(201).json(poll);
});

// Vote
app.post('/polls/:poll_str_id/vote', (req, res) => {
  const { poll_str_id } = req.params;
  const { option_str_id, user_identifier } = req.body;
  const poll = polls.get(poll_str_id);
  
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  if (poll.status !== 'active') return res.status(400).json({ error: 'Poll closed' });
  
  // Check duplicate vote
  if (user_identifier && votes.get(poll_str_id).has(user_identifier))
    return res.json({ status: 'already_voted' });
  
  // Find and increment option
  const option = poll.options.find(o => o.option_str_id === option_str_id);
  if (!option) return res.status(400).json({ error: 'Invalid option' });
  
  option.votes++;
  if (user_identifier) votes.get(poll_str_id).add(user_identifier);
  
  res.json({ status: 'vote_counted' });
});

// Get results
app.get('/polls/:poll_str_id/results', (req, res) => {
  const poll = polls.get(req.params.poll_str_id);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  
  res.json({
    poll_str_id: poll.poll_str_id,
    question: poll.question,
    results: poll.options.map(({ option_str_id, text, color, votes }) => 
      ({ option_str_id, text, color, votes }))
  });
});

// Get active polls
app.get('/polls/active', (req, res) => {
  const active = Array.from(polls.values())
    .filter(p => p.status === 'active')
    .map(({ poll_str_id, question }) => ({ poll_str_id, question }));
  res.json(active);
});

// Update poll status
app.put('/polls/:poll_str_id/status', (req, res) => {
  const poll = polls.get(req.params.poll_str_id);
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  
  poll.status = req.body.status;
  res.json({ poll_str_id: poll.poll_str_id, status: poll.status });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Quick test endpoints
console.log(`
Test with:
1. Create: curl -X POST http://localhost:${PORT}/polls -H "Content-Type: application/json" -d '{"question":"Favorite color?","options":[{"text":"Red"},{"text":"Blue"}]}'
2. Vote: curl -X POST http://localhost:${PORT}/polls/[POLL_ID]/vote -H "Content-Type: application/json" -d '{"option_str_id":"[POLL_ID]_option_1"}'
3. Results: curl http://localhost:${PORT}/polls/[POLL_ID]/results
`);