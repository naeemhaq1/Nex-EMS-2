import { db } from '../db';
import { employeeRecords } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export class AvatarService {
  /**
   * ALL AVATARS ARE MALE - no exceptions, no female avatars
   * User confirmed no Fatima/Aisha employees exist in real database
   */
  static determineGender(firstName: string, lastName: string): 'male' | 'female' {
    // ABSOLUTE REQUIREMENT: ALL avatars must be male, no exceptions
    return 'male';
  }

  /**
   * Get designation-specific avatar style based on job role
   */
  static getDesignationStyle(designation: string): string {
    const designationLower = designation.toLowerCase();
    
    if (designationLower.includes('field') || designationLower.includes('technician') || 
        designationLower.includes('engineer') || designationLower.includes('maintenance')) {
      return 'hardhat'; // Field employees with hard hats
    }
    
    if (designationLower.includes('manager') || designationLower.includes('supervisor') || 
        designationLower.includes('lead') || designationLower.includes('head')) {
      return 'professional'; // Management with professional attire
    }
    
    if (designationLower.includes('security') || designationLower.includes('guard')) {
      return 'security'; // Security personnel
    }
    
    if (designationLower.includes('driver') || designationLower.includes('operator')) {
      return 'operator'; // Drivers and operators
    }
    
    return 'office'; // Default office employee
  }

  /**
   * Generate professional avatar URL based on gender and designation
   */
  static generateProfessionalAvatar(
    firstName: string, 
    lastName: string, 
    designation: string, 
    employeeCode: string,
    size: number = 80
  ): string {
    const gender = this.determineGender(firstName, lastName);
    const style = this.getDesignationStyle(designation);
    const seed = employeeCode || `${firstName}-${lastName}`;
    
    // Use different avatar styles based on role and gender
    let avatarStyle = 'avataaars'; // Default professional style
    let accessories = '';
    
    switch (style) {
      case 'hardhat':
        avatarStyle = 'bottts'; // Robot/industrial style for field workers
        accessories = '&accessories=hardhat';
        break;
      case 'professional':
        avatarStyle = 'personas'; // Professional business style
        accessories = '&accessories=sunglasses';
        break;
      case 'security':
        avatarStyle = 'adventurer'; // Security style
        accessories = '&accessories=glasses';
        break;
      case 'operator':
        avatarStyle = 'micah'; // Casual professional
        accessories = '&accessories=cap';
        break;
      default:
        avatarStyle = 'avataaars'; // Standard office
        accessories = '';
    }
    
    // Generate consistent colors - ALL MALE AVATARS ONLY
    const backgroundColor = '2A2B5E'; // Dark blue for all male avatars
    const clothingColor = style === 'hardhat' ? 'FFA500' : '1E40AF'; // Orange for field, blue for office
    
    return `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(seed)}&size=${size}&backgroundColor=${backgroundColor}&clothingColor=${clothingColor}${accessories}`;
  }

  /**
   * Generate Gravatar URL from email (kept for compatibility)
   */
  static getGravatarUrl(email: string | null, size: number = 80): string {
    if (!email) {
      return this.getDefaultAvatar(size);
    }
    
    const hash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=pg`;
  }

  /**
   * Get employee avatar from multiple sources in priority order:
   * 1. Uploaded photo (if available)
   * 2. Professional gender/designation-specific avatar
   * 3. Gravatar fallback (if email exists)
   * 4. Default avatar
   */
  static async getEmployeeAvatar(employeeId: number, size: number = 80): Promise<string> {
    try {
      const [employee] = await db
        .select()
        .from(employeeRecords)
        .where(eq(employeeRecords.id, employeeId))
        .limit(1);

      if (!employee) {
        return this.getDefaultAvatar(size);
      }

      // Priority 1: Check for uploaded photo
      if (employee.profilePhoto) {
        return employee.profilePhoto;
      }

      // Priority 2: Generate professional avatar based on gender and designation
      const firstName = employee.firstName || 'Employee';
      const lastName = employee.lastName || '';
      const designation = employee.designation || 'Employee';
      const employeeCode = employee.employeeCode || employee.id.toString();
      
      return this.generateProfessionalAvatar(firstName, lastName, designation, employeeCode, size);
    } catch (error) {
      console.error('Error fetching employee avatar:', error);
      return this.getDefaultAvatar(size);
    }
  }

  /**
   * Generate identicon URL using employee code
   * DiceBear API provides professional-looking generated avatars
   */
  static getIdenticonUrl(seed: string, size: number = 80): string {
    // Using DiceBear API for professional identicons
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&size=${size}&backgroundColor=2A2B5E&textColor=ffffff`;
  }

  /**
   * Default professional male avatar fallback
   */
  static getDefaultAvatar(size: number = 80): string {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=default-male&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF`;
  }

  /**
   * Update employee profile photo
   */
  static async updateEmployeePhoto(employeeId: number, photoUrl: string): Promise<void> {
    await db
      .update(employeeRecords)
      .set({ profilePhoto: photoUrl })
      .where(eq(employeeRecords.id, employeeId));
  }

  /**
   * Get avatar URL for employee code with name and designation data
   */
  static getAvatarByCode(
    employeeCode: string, 
    firstName?: string, 
    lastName?: string, 
    designation?: string, 
    email?: string | null, 
    size: number = 80
  ): string {
    // If we have name and designation data, use professional avatar
    if (firstName && designation) {
      return this.generateProfessionalAvatar(firstName, lastName || '', designation, employeeCode, size);
    }
    
    // Fallback to Gravatar if email exists
    if (email) {
      return this.getGravatarUrl(email, size);
    }
    
    // Final fallback to identicon
    return this.getIdenticonUrl(employeeCode, size);
  }

  /**
   * Get 20+ avatar options for employee dashboard selection
   */
  static getAvatarOptions(size: number = 80): Array<{id: string, name: string, url: string, category: string}> {
    const avatarOptions = [
      // Male Professional Avatars (18 options)
      { id: 'male-prof-1', name: 'Professional Male 1', url: `https://api.dicebear.com/7.x/avataaars/svg?seed=prof-male-1&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF`, category: 'Professional Male' },
      { id: 'male-prof-2', name: 'Professional Male 2', url: `https://api.dicebear.com/7.x/avataaars/svg?seed=prof-male-2&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF&accessories=sunglasses`, category: 'Professional Male' },
      { id: 'male-prof-3', name: 'Professional Male 3', url: `https://api.dicebear.com/7.x/personas/svg?seed=exec-male-1&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF`, category: 'Professional Male' },
      { id: 'male-prof-4', name: 'Professional Male 4', url: `https://api.dicebear.com/7.x/personas/svg?seed=exec-male-2&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF&accessories=glasses`, category: 'Professional Male' },
      { id: 'male-field-1', name: 'Field Worker 1', url: `https://api.dicebear.com/7.x/bottts/svg?seed=field-1&size=${size}&backgroundColor=2A2B5E&clothingColor=FFA500`, category: 'Professional Male' },
      { id: 'male-field-2', name: 'Field Worker 2', url: `https://api.dicebear.com/7.x/bottts/svg?seed=field-2&size=${size}&backgroundColor=2A2B5E&clothingColor=FFA500&accessories=hardhat`, category: 'Professional Male' },
      { id: 'male-security-1', name: 'Security 1', url: `https://api.dicebear.com/7.x/adventurer/svg?seed=security-1&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF`, category: 'Professional Male' },
      { id: 'male-security-2', name: 'Security 2', url: `https://api.dicebear.com/7.x/adventurer/svg?seed=security-2&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF&accessories=glasses`, category: 'Professional Male' },
      { id: 'male-casual-1', name: 'Casual Professional 1', url: `https://api.dicebear.com/7.x/micah/svg?seed=casual-1&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF`, category: 'Professional Male' },
      { id: 'male-casual-2', name: 'Casual Professional 2', url: `https://api.dicebear.com/7.x/micah/svg?seed=casual-2&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF&accessories=cap`, category: 'Professional Male' },
      { id: 'male-office-1', name: 'Office Worker 1', url: `https://api.dicebear.com/7.x/avataaars/svg?seed=office-1&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF&accessories=prescription01`, category: 'Professional Male' },
      { id: 'male-office-2', name: 'Office Worker 2', url: `https://api.dicebear.com/7.x/avataaars/svg?seed=office-2&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF&accessories=prescription02`, category: 'Professional Male' },
      { id: 'male-manager-1', name: 'Manager 1', url: `https://api.dicebear.com/7.x/personas/svg?seed=manager-1&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF&accessories=sunglasses`, category: 'Professional Male' },
      { id: 'male-manager-2', name: 'Manager 2', url: `https://api.dicebear.com/7.x/personas/svg?seed=manager-2&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF&accessories=glasses`, category: 'Professional Male' },
      { id: 'male-tech-1', name: 'Technician 1', url: `https://api.dicebear.com/7.x/bottts/svg?seed=tech-1&size=${size}&backgroundColor=2A2B5E&clothingColor=FFA500&accessories=hardhat`, category: 'Professional Male' },
      { id: 'male-tech-2', name: 'Technician 2', url: `https://api.dicebear.com/7.x/bottts/svg?seed=tech-2&size=${size}&backgroundColor=2A2B5E&clothingColor=FFA500`, category: 'Professional Male' },
      { id: 'male-driver-1', name: 'Driver 1', url: `https://api.dicebear.com/7.x/micah/svg?seed=driver-1&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF&accessories=cap`, category: 'Professional Male' },
      { id: 'male-admin-1', name: 'Administrator', url: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin-1&size=${size}&backgroundColor=2A2B5E&clothingColor=1E40AF&accessories=prescription01`, category: 'Professional Male' },

      // Female Professional Avatars (2 options only as requested)
      { id: 'female-prof-1', name: 'Professional Female 1', url: `https://api.dicebear.com/7.x/avataaars/svg?seed=prof-female-1&size=${size}&backgroundColor=9333EA&clothingColor=8B5CF6`, category: 'Professional Female' },
      { id: 'female-prof-2', name: 'Professional Female 2', url: `https://api.dicebear.com/7.x/personas/svg?seed=prof-female-2&size=${size}&backgroundColor=9333EA&clothingColor=8B5CF6&accessories=glasses`, category: 'Professional Female' }
    ];

    return avatarOptions;
  }

  /**
   * Generate avatar from selected option ID
   */
  static generateSelectedAvatar(optionId: string, employeeCode: string, size: number = 80): string {
    const options = this.getAvatarOptions(size);
    const selectedOption = options.find(opt => opt.id === optionId);
    
    if (selectedOption) {
      // Replace seed with employee code for uniqueness while maintaining style
      return selectedOption.url.replace(/seed=[^&]+/, `seed=${encodeURIComponent(employeeCode)}`);
    }
    
    return this.getDefaultAvatar(size);
  }
}