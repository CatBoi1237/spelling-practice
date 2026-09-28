export const CODE_WORDS = [
  ['apple', 'A crisp fruit that grows on a tree.'],
  ['beach', 'A sandy or pebbly shore beside the sea.'],
  ['brain', 'The organ inside your head that helps you think.'],
  ['chair', 'A seat with a back, usually for one person.'],
  ['cloud', 'A mass of tiny water droplets floating in the sky.'],
  ['dream', 'A story or experience in your mind while you sleep.'],
  ['earth', 'The planet on which we live.'],
  ['flame', 'The bright, burning part of a fire.'],
  ['grape', 'A small juicy fruit that grows in bunches.'],
  ['house', 'A building where people live.'],
  ['light', 'What lets us see things; the opposite of darkness.'],
  ['plant', 'A living thing that usually grows roots and leaves.'],
  ['river', 'A large natural stream of flowing water.'],
  ['sheep', 'A farm animal raised for its wool.'],
  ['smile', 'A happy expression made with your mouth.'],
  ['spoon', 'A utensil used to eat soup.'],
  ['stone', 'A small piece of rock.'],
  ['tiger', 'A large striped wild cat.'],
  ['train', 'A vehicle that travels along railway tracks.'],
  ['water', 'The liquid we drink and use to wash.'],
].map(([word, clue]) => ({ word, clue }));

export const CODE_GUESSES = [...new Set([...CODE_WORDS.map(item => item.word), ...('arise alert alter later stare tears rates slate steal least stale trace crate react cater crane cream dream steam teamS plate pleat plane panel penal petal dealt delta metal melon lemon noble below elbow bowel blown brown crown clown clean clear learn pearl realm bread break brake brave grave grace grain drain drawn grant giant grand green greet fleet sleep sweep sweet wheel whole whale white write quite quiet queen query quick quilt round sound found bound wound mound pound proud cloud could would should sharp shark share shape shake shade trade tread tried tired trial trail aisle alive alone along aloud angle angel angry carry curry berry merry marry happy puppy funny honey money sunny rainy snowy windy party paste taste waste haste tense sense dense fence hence since rinse raise price prize twice slice spice space spare spark speak spear spent spend speed spell small shall still skill spill chill chest chess check cheek cheer sheep sheet shoes shoot short shore store score snore sport start smart stamp stand stack stick stock stuck truck trick track black blank blink block clock close chose those these there three threw throw grown known throw fruit front frost trust truth youth tooth teeth thick thinK thing bring swing sting string singer serve seven every never lever level refer radar civic kayak rotor apple apply ample maple papal paper poppy puppy piper peppy eerie erase eager eagle lease tease cease peace piece niece field yield build guilt guide guise guest guess glass grass class cross dress press bless fresh flesh flash crash brush blush flush crush crust roast coast toast boast beast least feast yeast boats goats coats loads roads toads hands lands bands sands seats heats meats bears pears wears years books looks cooks hooks pools tools fools doors floors').toLowerCase().split(/\s+/).filter(word => word.length === 5)])];

const hive = (letters, centre, entries) => ({ letters: [...letters], centre, words: entries.map(([word, clue]) => ({ word, clue })) });
export const HIVES = [
  hive('aelnpst', 'a', [
    ['planets', 'Worlds that orbit a star.'], ['planet', 'A world that orbits a star.'], ['plane', 'A flying vehicle with wings.'], ['panel', 'A flat section of a wall or door.'],
    ['plate', 'A flat dish for serving food.'], ['plates', 'Flat dishes for serving food.'], ['plant', 'A living thing with roots and leaves.'], ['plants', 'Living things with roots and leaves.'],
    ['pale', 'Light in colour.'], ['peal', 'A loud ringing of bells.'], ['leap', 'To jump a long way.'], ['sale', 'An event where goods are sold at reduced prices.'],
    ['seal', 'A sea mammal with flippers.'], ['lane', 'A narrow road or a marked strip of a road.'], ['lean', 'To rest at an angle against something.'], ['late', 'After the expected time.'],
    ['tale', 'A story.'], ['teal', 'A colour between blue and green.'], ['stale', 'No longer fresh, like old bread.'], ['steal', 'To take something without permission.'],
    ['slate', 'A dark rock that splits into thin layers.'], ['least', 'The smallest amount.'], ['taste', 'To sense the flavour of food.'], ['state', 'A territory such as Victoria.'],
    ['tape', 'A sticky strip used to hold things together.'], ['paste', 'A thick sticky mixture.'], ['past', 'The time before now.'], ['salt', 'A seasoning often used with pepper.'],
    ['atlas', 'A book of maps.'], ['asleep', 'Not awake.'], ['please', 'A polite word used when making a request.'], ['pleasant', 'Enjoyable or nice.'],
  ]),
  hive('acehrst', 'r', [
    ['teachers', 'People who help others learn.'], ['teacher', 'A person who helps others learn.'], ['reach', 'To stretch out to touch something.'], ['crate', 'A large box for carrying things.'],
    ['trace', 'To follow the outline of a shape.'], ['react', 'To respond to something that happens.'], ['cater', 'To provide food for an event.'], ['chart', 'A diagram that shows information.'],
    ['heart', 'The organ that pumps blood.'], ['earth', 'The planet we live on.'], ['share', 'To let another person use some of what you have.'], ['shear', 'To cut wool from a sheep.'],
    ['stare', 'To look at something for a long time.'], ['tear', 'A drop of liquid from your eye.'], ['rate', 'How quickly something happens.'], ['care', 'To look after someone or something.'],
    ['race', 'A competition to find who is fastest.'], ['rare', 'Not common.'], ['rear', 'The back part of something.'], ['rest', 'To relax after doing work.'],
    ['star', 'A ball of hot gas that shines in space.'], ['start', 'To begin.'], ['street', 'A road in a town with buildings along it.'], ['three', 'The number after two.'],
    ['cheer', 'A loud shout of happiness or support.'], ['harsh', 'Rough, severe or unpleasant.'], ['crash', 'A sudden violent collision.'],
  ]),
  hive('aeilnrt', 'i', [
    ['retinal', 'Relating to the light-sensitive layer at the back of the eye.'], ['train', 'A vehicle that travels on rails.'], ['trail', 'A path through the countryside.'], ['trial', 'A test to see how well something works.'],
    ['rain', 'Water drops falling from clouds.'], ['rail', 'One of the long metal bars on a railway.'], ['tail', 'The part extending from the back of an animal.'], ['nail', 'A small metal spike used to join wood.'],
    ['liar', 'A person who tells things that are not true.'], ['lair', 'A wild animal’s resting place.'], ['line', 'A long narrow mark.'], ['linen', 'Cloth made from the flax plant.'],
    ['linear', 'Arranged in a straight line.'], ['inner', 'On the inside.'], ['inert', 'Not moving or reacting.'], ['tire', 'To become weary.'],
    ['tile', 'A flat piece used to cover a floor or wall.'], ['tilt', 'To lean or slope to one side.'], ['tint', 'A small amount of colour.'], ['lint', 'Tiny fibres that come off fabric.'],
    ['retain', 'To keep something.'], ['retina', 'The light-sensitive layer at the back of the eye.'], ['entire', 'Whole or complete.'],
  ]),
];
