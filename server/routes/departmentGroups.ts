import { Request, Response } from "express";
import { storage } from "../storage";
import { insertDepartmentGroupSchema } from "@shared/departmentGroups";
import { z } from "zod";

const updateDepartmentsSchema = z.object({
  departments: z.array(z.string()),
});

export async function getDepartmentGroups(req: Request, res: Response) {
  try {
    const groups = await storage.getDepartmentGroups();
    res.json(groups);
  } catch (error) {
    console.error("Error fetching department groups:", error);
    res.status(500).json({ error: "Failed to fetch department groups" });
  }
}

export async function getDepartmentGroup(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const group = await storage.getDepartmentGroup(id);
    
    if (!group) {
      return res.status(404).json({ error: "Department group not found" });
    }
    
    res.json(group);
  } catch (error) {
    console.error("Error fetching department group:", error);
    res.status(500).json({ error: "Failed to fetch department group" });
  }
}

export async function createDepartmentGroup(req: Request, res: Response) {
  try {
    const data = insertDepartmentGroupSchema.parse(req.body);
    const group = await storage.createDepartmentGroup({
      ...data,
      createdBy: req.session.userId,
    });
    res.status(201).json(group);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    console.error("Error creating department group:", error);
    res.status(500).json({ error: "Failed to create department group" });
  }
}

export async function updateDepartmentGroup(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const group = await storage.getDepartmentGroup(id);
    
    if (!group) {
      return res.status(404).json({ error: "Department group not found" });
    }
    
    const data = insertDepartmentGroupSchema.partial().parse(req.body);
    const updatedGroup = await storage.updateDepartmentGroup(id, data);
    res.json(updatedGroup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    console.error("Error updating department group:", error);
    res.status(500).json({ error: "Failed to update department group" });
  }
}

export async function deleteDepartmentGroup(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const group = await storage.getDepartmentGroup(id);
    
    if (!group) {
      return res.status(404).json({ error: "Department group not found" });
    }
    
    // Department groups can now be deleted freely as they're aggregation containers
    
    await storage.deleteDepartmentGroup(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting department group:", error);
    res.status(500).json({ error: "Failed to delete department group" });
  }
}

export async function updateDepartmentGroupDepartments(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const group = await storage.getDepartmentGroup(id);
    
    if (!group) {
      return res.status(404).json({ error: "Department group not found" });
    }
    
    const { departments } = updateDepartmentsSchema.parse(req.body);
    
    // Departments can now belong to multiple groups for aggregation purposes
    // No need to check for conflicts as groups are aggregation containers
    
    const updatedGroup = await storage.updateDepartmentGroup(id, { departments });
    res.json(updatedGroup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    console.error("Error updating department group departments:", error);
    res.status(500).json({ error: "Failed to update department group departments" });
  }
}