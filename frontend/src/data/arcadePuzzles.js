export const EXTRA_GAMES = [
  { id: 'hangman', title: 'Hangman', description: 'Use a meaning clue and letter guesses to uncover a word before six misses.', level: true },
  { id: 'ladder', title: 'Word Ladder', description: 'Change one letter at a time to connect two words. Hints help you find a route.' },
  { id: 'grid', title: 'Letter Grid', description: 'A Boggle-style hunt: spell words using neighbouring letters without reusing a tile.' },
  { id: 'categories', title: 'Category Sprint', description: 'A Scattergories-style challenge: one starting letter, three categories, carefully spelled answers.' },
  { id: 'bingo', title: 'Word Bingo', description: 'Listen to each call or read its clue, then find the matching word. Make a line of three.', level: true },
  { id: 'rhyme', title: 'Rhyme Time', description: 'Read a clue and spell a word that rhymes with the target. Sound matters more than matching endings.' },
  { id: 'search', title: 'Word Search', description: 'Select the ends of a hidden word, then cover the grid and spell it from memory.', level: true },
  { id: 'clock', title: 'Beat the Clock', description: 'A one-minute spelling challenge with audio, definition clues and a review of missed words.', level: true },
  { id: 'clues', title: 'Guess My Word', description: 'Reveal up to three clues, then spell the mystery word. Fewer clues earn more points.', level: true },
  { id: 'bee', title: 'Pass-and-Play Spelling Bee', description: 'Two to eight players spell aloud. A host checks answers; missed words eliminate players.', level: true, party: true },
  { id: 'relay', title: 'Spelling Relay', description: 'Two teams share a device and take turns adding one letter to a spelling. No running required.', level: true, party: true },
];

export const LADDERS = [
  ['cat', 'cot', 'dot', 'dog'],
  ['cold', 'cord', 'card', 'ward', 'warm'],
  ['head', 'heal', 'teal', 'tell', 'tall', 'tail'],
  ['spin', 'span', 'scan', 'scat', 'seat'],
  ['rain', 'rail', 'tail', 'tall'],
  ['book', 'boot', 'soot', 'slot', 'slat', 'flat'],
];
export const LADDER_WORDS = [...new Set(LADDERS.flat().concat(['bat', 'bag', 'bog', 'dig', 'fig', 'fog', 'log', 'lot', 'hot', 'hat', 'hit', 'bit', 'bet', 'bed', 'bad', 'can', 'cap', 'car', 'bar', 'tar', 'rat', 'red', 'rod', 'rag', 'tag', 'tan', 'tin', 'ton', 'son', 'sun', 'fun', 'fan', 'fat', 'fit', 'fin', 'win', 'wet', 'pet', 'pot', 'pan', 'pin', 'pit', 'sit', 'sat', 'sip', 'tip', 'top', 'tap', 'map', 'mat', 'mad', 'sad', 'sap', 'lap', 'lip', 'lid', 'led', 'leg', 'beg', 'big', 'pig', 'pen', 'ten', 'net', 'nut', 'cut', 'cup', 'pup', 'put', 'but', 'bud', 'bug', 'hug', 'hum', 'sum', 'ram', 'rim', 'rip', 'rap', 'sap', 'same', 'came', 'case', 'care', 'core', 'cure', 'sure', 'sire', 'fire', 'fine', 'line', 'lane', 'late', 'date', 'dare', 'dark', 'bark', 'barn', 'born', 'corn', 'worn', 'word', 'wood', 'good', 'food', 'fool', 'pool', 'poll', 'pole', 'pale', 'sale', 'salt', 'sand', 'hand', 'hard', 'harm', 'farm', 'form', 'firm', 'bird', 'bind', 'band', 'bend', 'send', 'sent', 'rent', 'rest', 'test', 'tent', 'tend', 'team', 'tear', 'bear', 'beat', 'boat', 'coat', 'coal', 'goal', 'goat', 'gold', 'fold', 'sold', 'bold', 'bald', 'ball', 'fall', 'wall', 'walk', 'talk', 'balk', 'bake', 'lake', 'like', 'bike', 'hike', 'hire', 'wire', 'wide', 'ride', 'hide', 'side', 'site', 'bite', 'kite']))];

export const GRID_LETTERS = ['cats', 'oren', 'digh', 'lpot'].join('');
export const GRID_WORDS = ['cat', 'cats', 'car', 'cars', 'cart', 'care', 'cares', 'cared', 'cater', 'catered', 'art', 'arts', 'are', 'ear', 'ears', 'eat', 'eats', 'ate', 'tea', 'teas', 'tear', 'tears', 'tar', 'rat', 'rats', 'rate', 'rates', 'star', 'stare', 'stared', 'store', 'tone', 'tones', 'ton', 'tons', 'ten', 'net', 'nets', 'nest', 'rest', 'rent', 'red', 'rid', 'ride', 'rind', 'ring', 'rig', 'dig', 'dog', 'dot', 'dots', 'god', 'got', 'get', 'gets', 'hot', 'hen', 'hens', 'her', 'hers', 'hit', 'hip', 'hop', 'hog', 'pot', 'pots', 'pig', 'pin', 'pine', 'pit', 'top', 'tip', 'tin', 'tins', 'lid', 'lip', 'lit', 'log', 'lot', 'lion', 'line', 'lines', 'gone', 'one', 'ones', 'ore', 'ores', 'or', 'go', 'do'];

export const CATEGORY_ROUNDS = [
  { letter: 'c', groups: { Animals: ['cat', 'camel', 'cow', 'crocodile', 'cheetah', 'chicken', 'crab', 'crow', 'cobra', 'cougar', 'chimpanzee'], Foods: ['cake', 'carrot', 'cheese', 'cherry', 'chicken', 'chocolate', 'corn', 'cucumber', 'cabbage', 'coconut', 'curry'], Places: ['canada', 'china', 'chile', 'cuba', 'cambodia', 'croatia', 'canberra', 'cairns', 'cairo', 'colombia', 'cyprus'] } },
  { letter: 'b', groups: { Animals: ['bear', 'bee', 'bat', 'beaver', 'buffalo', 'badger', 'butterfly', 'baboon', 'bison', 'beetle'], Foods: ['banana', 'bread', 'bean', 'beans', 'biscuit', 'broccoli', 'butter', 'bacon', 'beetroot', 'blueberry', 'beef'], Places: ['brazil', 'belgium', 'brisbane', 'berlin', 'bali', 'bangkok', 'bangladesh', 'bolivia', 'bulgaria', 'bahrain'] } },
  { letter: 's', groups: { Animals: ['snake', 'sheep', 'shark', 'seal', 'spider', 'swan', 'snail', 'squirrel', 'seahorse', 'salmon', 'sloth'], Foods: ['soup', 'salad', 'sandwich', 'sausage', 'spinach', 'strawberry', 'sugar', 'salmon', 'sushi', 'steak'], Places: ['sydney', 'spain', 'sweden', 'singapore', 'scotland', 'switzerland', 'samoa', 'seoul', 'sudan', 'senegal'] } },
  { letter: 'p', groups: { Animals: ['pig', 'panda', 'parrot', 'penguin', 'pelican', 'platypus', 'panther', 'porcupine', 'pigeon', 'python'], Foods: ['pear', 'peach', 'plum', 'potato', 'pasta', 'pizza', 'pumpkin', 'pineapple', 'pea', 'peas', 'pancake', 'popcorn'], Places: ['perth', 'paris', 'poland', 'portugal', 'peru', 'pakistan', 'panama', 'philippines', 'prague', 'palau'] } },
  { letter: 'm', groups: { Animals: ['monkey', 'mouse', 'moose', 'moth', 'mole', 'meerkat', 'macaw', 'magpie', 'manatee', 'mosquito'], Foods: ['mango', 'melon', 'milk', 'mushroom', 'muffin', 'macaroni', 'marshmallow', 'maize', 'meat', 'muesli'], Places: ['melbourne', 'mexico', 'malaysia', 'morocco', 'madrid', 'malta', 'madagascar', 'mali', 'mongolia', 'monaco'] } },
];

export const RHYMES = [
  { cue: 'light', word: 'night', clue: 'The dark part of each day.' },
  { cue: 'blue', word: 'shoe', clue: 'You wear one on each foot.' },
  { cue: 'rain', word: 'train', clue: 'A vehicle that travels on rails.' },
  { cue: 'bear', word: 'chair', clue: 'A seat with a back, usually for one person.' },
  { cue: 'cake', word: 'snake', clue: 'A long reptile with no legs.' },
  { cue: 'tree', word: 'bee', clue: 'An insect that can make honey.' },
  { cue: 'boat', word: 'goat', clue: 'A farm animal with horns and often a beard.' },
  { cue: 'head', word: 'bread', clue: 'A baked food used to make sandwiches.' },
  { cue: 'moon', word: 'spoon', clue: 'A utensil you use to eat soup.' },
  { cue: 'mouse', word: 'house', clue: 'A building where people live.' },
  { cue: 'fly', word: 'sky', clue: 'The space above us where clouds appear.' },
  { cue: 'rough', word: 'tough', clue: 'Strong and difficult to break.' },
];
