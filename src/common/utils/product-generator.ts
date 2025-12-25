import { CreateProductDto, MeasurementType, SizeDto } from "../../core/product/dto/create-product.dto";

export interface RandomProductOptions {
  businessId: number;
userId: number;
  hasVariation?: boolean;
}

export const CATEGORY_POOL = [
  'Men\'s Fashion',
  'Women\'s Fashion',
  'Beauty & Personal Care',
  'Consumer Electronics',
  'Home & Living',
  'Sports & Outdoors',
  'Toys & Games',
  'Automotive',
  'Food & Beverages',
  'Books & Stationery',
];

export const PRODUCT_IMAGES: Record<string, string[]> = {
  "Men's Fashion": [
    'https://images.unsplash.com/photo-1618354692494-034f5f9f3cf7',
    'https://images.unsplash.com/photo-1521334884684-d80222895322'
  ],
  "Women\'s Fashion": [
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246',
    'https://images.unsplash.com/photo-1520975911475-6b539e98fa1a'
  ],
  'Beauty & Personal Care': [
    'https://images.unsplash.com/photo-1588776814546-11ebed6d9466',
    'https://images.unsplash.com/photo-1590080873056-d0ce9f37a667'
  ],
  'Consumer Electronics': [
    'https://images.unsplash.com/photo-1580894894514-9e868bb6c3e1',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8'
  ],
  'Home & Living': [
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511',
    'https://images.unsplash.com/photo-1582582421139-6f3a3d742fe2'
  ],
  'Sports & Outdoors': [
    'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf',
    'https://images.unsplash.com/photo-1526403223832-91dc0f6d6d76'
  ],
  'Toys & Games': [
    'https://images.unsplash.com/photo-1560807707-8cc77767d783',
    'https://images.unsplash.com/photo-1609854247985-0c37410216c2'
  ],
  'Automotive': [
    'https://images.unsplash.com/photo-1603816249581-b03f051374b5',
    'https://images.unsplash.com/photo-1581092580496-fba5f83ed5b7'
  ],
  'Food & Beverages': [
    'https://images.unsplash.com/photo-1600891964599-f61ba0e24092',
    'https://images.unsplash.com/photo-1589923188900-89d86c57f5ef'
  ],
  'Books & Stationery': [
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794'
  ]
};

export const generateHexColor = (): string =>
  `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`;

const randomFromArray = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const generateRandomProduct = (
  options: RandomProductOptions
): CreateProductDto => {
  const { businessId, hasVariation = false } = options;

  // Choose category
  const category = randomFromArray(CATEGORY_POOL);

  // Pick a matching image for that category
  const image = randomFromArray(PRODUCT_IMAGES[category]);

  // Generate realistic product names per category
  const productNameMap: Record<string, string[]> = {
    "Men's Fashion": [
      'Classic Linen Shirt',
      'Slim Fit Jeans',
      'Leather Jacket',
      'Casual Polo Tee'
    ],
    "Women's Fashion": [
      'Silk Summer Dress',
      'Chiffon Blouse',
      'High-Waist Skirt',
      'Denim Jacket'
    ],
    'Beauty & Personal Care': [
      'Shea Glow Body Butter',
      'Aromatherapy Essential Oils',
      'Hydrating Facial Serum',
      'Vitamin C Face Cream'
    ],
    'Consumer Electronics': [
      'Apex SilentTouch Wireless Mouse',
      'X-Drone Mini Quadcopter',
      'Smart LED Desk Lamp',
      'Bluetooth Noise-Cancelling Headphones'
    ],
    'Home & Living': [
      'Bamboo Essence Table Lamp',
      'Ceramic Plant Pot Set',
      'Ergonomic Office Chair',
      'Memory Foam Pillow'
    ],
    'Sports & Outdoors': [
      'ProFit Yoga Mat',
      'Carbon Fiber Tennis Racket',
      'Waterproof Hiking Backpack',
      'Adjustable Dumbbell Set'
    ],
    'Toys & Games': [
      'Wooden Puzzle Set',
      'Remote Control Car',
      'Building Blocks Kit',
      'Interactive Storybook'
    ],
    'Automotive': [
      'All-Weather Car Seat Cover',
      'LED Car Headlights',
      'Motor Oil Synthetic Blend',
      'Portable Jump Starter'
    ],
    'Food & Beverages': [
      'Organic Green Tea',
      'Artisan Dark Chocolate',
      'Premium Olive Oil',
      'Spicy Hot Sauce'
    ],
    'Books & Stationery': [
      'Hardcover Notebook Set',
      'Inspirational Quote Journal',
      'Planner 2026 Edition',
      'Luxury Fountain Pen'
    ]
  };

  const name = randomFromArray(productNameMap[category]);

  // Generate realistic description
  const description = `High-quality ${name.toLowerCase()} from our ${category} collection. Crafted for durability and style.`;

  // Sizes/colors variations
  const sizes: SizeDto[] | undefined = hasVariation
    ? [
      {
        measurement: MeasurementType.SIZE,
        value: ['S', 'M', 'L', 'XL']
      }
    ]
    : undefined;
  const colors = hasVariation
    ? [generateHexColor(), generateHexColor()]
    : undefined;

  return {
    businessId,
    category,
    name,
    description,
    price: parseFloat((Math.random() * 100 + 10).toFixed(2)),
    quantityInStock: Math.floor(Math.random() * 100) + 1,
    imageUrls: [image],
    hasVariation,
    sizes,
    colors
  };
};
