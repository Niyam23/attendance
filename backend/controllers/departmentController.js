const { Department, User } = require('../models');
const { Op } = require('sequelize');

// Get all departments
exports.getAllDepartments = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const departments = await Department.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json({
      departments: departments,
      total: departments.length
    });
  } catch (error) {
    console.error('Get all departments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single department by ID
exports.getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({ department });
  } catch (error) {
    console.error('Get department by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create department
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description, isActive = true } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Department name is required' });
    }

    // Check if department with same name or code exists
    const existing = await Department.findOne({
      where: {
        [Op.or]: [
          { name: name.trim() },
          ...(code ? [{ code: code.trim() }] : [])
        ]
      }
    });

    if (existing) {
      return res.status(400).json({
        message: `Department with ${existing.name === name.trim() ? 'name' : 'code'} already exists`
      });
    }

    const department = await Department.create({
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : null,
      description: description ? description.trim() : null,
      isActive
    });

    res.status(201).json({
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update department
exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if name or code conflicts with another department
    if (name || code) {
      const existing = await Department.findOne({
        where: {
          id: { [Op.ne]: id },
          [Op.or]: [
            ...(name ? [{ name: name.trim() }] : []),
            ...(code ? [{ code: code.trim().toUpperCase() }] : [])
          ]
        }
      });

      if (existing) {
        return res.status(400).json({
          message: `Department with ${existing.name === name?.trim() ? 'name' : 'code'} already exists`
        });
      }
    }

    // Update fields
    if (name !== undefined) department.name = name.trim();
    if (code !== undefined) department.code = code ? code.trim().toUpperCase() : null;
    if (description !== undefined) department.description = description ? description.trim() : null;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    res.json({
      message: 'Department updated successfully',
      department
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete department
exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByPk(id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Check if department has employees using count query
    const employeeCount = await User.count({
      where: { departmentId: id }
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        message: `Cannot delete department. ${employeeCount} employee(s) are assigned to this department. Please reassign them first.`
      });
    }

    await department.destroy();

    res.json({
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Seed default departments
exports.seedDepartments = async (req, res) => {
  try {
    const defaultDepartments = [
      { name: 'Human Resources', code: 'HR', description: 'Human Resources and People Management' },
      { name: 'Information Technology', code: 'IT', description: 'Information Technology and Systems' },
      { name: 'Sales', code: 'SALES', description: 'Sales and Business Development' },
      { name: 'Marketing', code: 'MKTG', description: 'Marketing and Communications' },
      { name: 'Finance', code: 'FIN', description: 'Finance and Accounting' },
      { name: 'Operations', code: 'OPS', description: 'Operations and Administration' },
      { name: 'Customer Support', code: 'CS', description: 'Customer Support and Service' },
      { name: 'Product Development', code: 'PROD', description: 'Product Development and Engineering' },
      { name: 'Quality Assurance', code: 'QA', description: 'Quality Assurance and Testing' },
      { name: 'Legal', code: 'LEGAL', description: 'Legal and Compliance' },
      { name: 'Research & Development', code: 'R&D', description: 'Research and Development' },
      { name: 'Business Development', code: 'BD', description: 'Business Development and Partnerships' },
      { name: 'Supply Chain', code: 'SCM', description: 'Supply Chain and Logistics' },
      { name: 'Manufacturing', code: 'MFG', description: 'Manufacturing and Production' },
      { name: 'Design', code: 'DESIGN', description: 'Design and Creative' },
      { name: 'Security', code: 'SEC', description: 'Security and Safety' },
      { name: 'Training & Development', code: 'T&D', description: 'Training and Development' },
      { name: 'Administration', code: 'ADMIN', description: 'General Administration' }
    ];

    const createdDepartments = [];
    const existingDepartments = [];

    for (const dept of defaultDepartments) {
      const existing = await Department.findOne({
        where: {
          [Op.or]: [
            { name: dept.name },
            { code: dept.code }
          ]
        }
      });

      if (existing) {
        existingDepartments.push(dept.name);
      } else {
        const department = await Department.create(dept);
        createdDepartments.push(department);
      }
    }

    res.json({
      message: 'Departments seeded successfully',
      created: createdDepartments.length,
      existing: existingDepartments.length,
      departments: createdDepartments,
      skipped: existingDepartments
    });
  } catch (error) {
    console.error('Seed departments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
