import portManagementRoutes from "./portManagement";
import portConfigurationRoutes from "./portConfiguration";
app.use("/api/port-management", portManagementRoutes);
app.use("/api/port-config", portConfigurationRoutes);