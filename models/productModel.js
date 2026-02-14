// Product model - defines the structure and validation
class Product {
  constructor(data) {
    this.id = data.id;
    this.item_no = data.item_no;
    this.name = data.name;
    this.image = data.image;
    this.description = data.description;
    this.price = data.price;
    this.availability = data.availability;
    this.menu_id = data.menu_id;
    this.category_id = data.category_id;
    this.featured = data.featured;
    this.discount = data.discount;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Validate product data
  static validate(data, isUpdate = false) {
    const errors = [];

    // Check item_no (required for create, optional for update)
    if (!isUpdate && (!data.item_no || typeof data.item_no !== 'string')) {
      errors.push('Item number is required and must be a string');
    } else if (data.item_no && data.item_no.trim().length < 1) {
      errors.push('Item number must be at least 1 character long');
    } else if (data.item_no && data.item_no.trim().length > 50) {
      errors.push('Item number must not exceed 50 characters');
    }

    // Check name
    if (!data.name || typeof data.name !== 'string') {
      errors.push('Product name is required and must be a string');
    } else if (data.name.trim().length < 2) {
      errors.push('Product name must be at least 2 characters long');
    } else if (data.name.trim().length > 200) {
      errors.push('Product name must not exceed 200 characters');
    }

    // Check description
    if (!data.description || typeof data.description !== 'string') {
      errors.push('Product description is required and must be a string');
    } else if (data.description.trim().length < 10) {
      errors.push('Product description must be at least 10 characters long');
    } else if (data.description.trim().length > 1000) {
      errors.push('Product description must not exceed 1000 characters');
    }

    // Check price
    if (data.price !== undefined) {
      const priceNum = parseFloat(data.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        errors.push('Price must be a positive number');
      } else if (priceNum > 99999999.99) {
        errors.push('Price must not exceed 99,999,999.99');
      }
    } else if (!isUpdate) {
      errors.push('Price is required');
    }

    // Check availability
    if (data.availability && !['yes', 'no'].includes(data.availability.toLowerCase())) {
      errors.push('Availability must be either "yes" or "no"');
    }

    // Check featured
    if (data.featured && !['yes', 'no'].includes(data.featured.toLowerCase())) {
      errors.push('Featured must be either "yes" or "no"');
    }

    // Check discount
    if (data.discount !== undefined) {
      const discountNum = parseFloat(data.discount);
      if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
        errors.push('Discount must be between 0 and 100');
      }
    }

    // Menu and Category are optional - no validation needed

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize data before saving
  static sanitize(data) {
    const sanitized = {};

    if (data.item_no) sanitized.item_no = data.item_no.trim();
    if (data.name) sanitized.name = data.name.trim();
    if (data.description) sanitized.description = data.description.trim();
    if (data.price !== undefined) sanitized.price = parseFloat(data.price);
    if (data.availability) sanitized.availability = data.availability.toLowerCase();
    
    // Handle optional menu_id (can be null or empty string)
    if (data.menu_id !== undefined) {
      sanitized.menu_id = data.menu_id === '' || data.menu_id === null ? null : data.menu_id;
    }
    
    // Handle optional category_id (can be null or empty string)
    if (data.category_id !== undefined) {
      sanitized.category_id = data.category_id === '' || data.category_id === null ? null : data.category_id;
    }
    
    if (data.featured) sanitized.featured = data.featured.toLowerCase();
    if (data.discount !== undefined) sanitized.discount = parseFloat(data.discount);

    return sanitized;
  }
}

module.exports = Product;