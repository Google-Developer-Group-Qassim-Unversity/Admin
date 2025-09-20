"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, Plus, Edit, Trash2, Users, Building2, Calendar, Activity, Search } from "lucide-react"
import Link from "next/link"
import { apiClient, type Department, type Member, type Event, type Action, MOCK_DATA } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function DataManagementPage() {
  const { toast } = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("departments")
  const [searchTerm, setSearchTerm] = useState("")

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [dialogType, setDialogType] = useState<"department" | "member" | "event" | "action">("department")

  // Form states
  const [departmentForm, setDepartmentForm] = useState({ name: "" })
  const [memberForm, setMemberForm] = useState({ name: "", email: "", phone_number: "", uni_id: "" })
  const [eventForm, setEventForm] = useState({ name: "" })
  const [actionForm, setActionForm] = useState({ name: "", points: "" })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Using mock data for now
      setDepartments(MOCK_DATA.departments)
      setMembers(MOCK_DATA.members)
      setEvents(MOCK_DATA.events)
      setActions(MOCK_DATA.actions)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openDialog = (type: typeof dialogType, item?: any) => {
    setDialogType(type)
    setEditingItem(item)

    // Reset forms
    setDepartmentForm({ name: item?.name || "" })
    setMemberForm({
      name: item?.name || "",
      email: item?.email || "",
      phone_number: item?.phone_number || "",
      uni_id: item?.uni_id || "",
    })
    setEventForm({ name: item?.name || "" })
    setActionForm({ name: item?.name || "", points: item?.points?.toString() || "" })

    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      let data: any
      let endpoint: string

      switch (dialogType) {
        case "department":
          data = departmentForm
          endpoint = editingItem ? `/departments/${editingItem.id}` : "/departments"
          break
        case "member":
          data = memberForm
          endpoint = editingItem ? `/members/${editingItem.id}` : "/members"
          break
        case "event":
          data = eventForm
          endpoint = editingItem ? `/events/${editingItem.id}` : "/events"
          break
        case "action":
          data = { ...actionForm, points: Number.parseInt(actionForm.points) }
          endpoint = editingItem ? `/actions/${editingItem.id}` : "/actions"
          break
      }

      if (editingItem) {
        await apiClient.put(endpoint, data)
        toast({ title: "Success", description: `${dialogType} updated successfully` })
      } else {
        await apiClient.post(endpoint, data)
        toast({ title: "Success", description: `${dialogType} created successfully` })
      }

      setIsDialogOpen(false)
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingItem ? "update" : "create"} ${dialogType}`,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (type: typeof dialogType, id: number) => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return

    try {
      let endpoint: string
      switch (type) {
        case "department":
          endpoint = `/departments/${id}`
          break
        case "member":
          endpoint = `/members/${id}`
          break
        case "event":
          endpoint = `/events/${id}`
          break
        case "action":
          endpoint = `/actions/${id}`
          break
      }

      await apiClient.delete(endpoint)
      toast({ title: "Success", description: `${type} deleted successfully` })
      loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete ${type}`,
        variant: "destructive",
      })
    }
  }

  const filterData = (data: any[], searchTerm: string) => {
    if (!searchTerm) return data
    return data.filter((item) =>
      Object.values(item).some((value) => value?.toString().toLowerCase().includes(searchTerm.toLowerCase())),
    )
  }

  const renderDialogContent = () => {
    switch (dialogType) {
      case "department":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name *</Label>
              <Input
                id="name"
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm({ name: e.target.value })}
                placeholder="Enter department name"
              />
            </div>
          </div>
        )
      case "member":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uni_id">University ID *</Label>
                <Input
                  id="uni_id"
                  value={memberForm.uni_id}
                  onChange={(e) => setMemberForm({ ...memberForm, uni_id: e.target.value })}
                  placeholder="Enter university ID"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={memberForm.email}
                onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={memberForm.phone_number}
                onChange={(e) => setMemberForm({ ...memberForm, phone_number: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
          </div>
        )
      case "event":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                value={eventForm.name}
                onChange={(e) => setEventForm({ name: e.target.value })}
                placeholder="Enter event name"
              />
            </div>
          </div>
        )
      case "action":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Action Name *</Label>
              <Input
                id="name"
                value={actionForm.name}
                onChange={(e) => setActionForm({ ...actionForm, name: e.target.value })}
                placeholder="Enter action name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Points *</Label>
              <Input
                id="points"
                type="number"
                value={actionForm.points}
                onChange={(e) => setActionForm({ ...actionForm, points: e.target.value })}
                placeholder="Enter points value"
              />
            </div>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-playfair font-bold text-foreground">Data Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage core data: members, departments, events, and actions
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search across all data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="departments" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Departments
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Events
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Actions
              </TabsTrigger>
            </TabsList>

            {/* Departments Tab */}
            <TabsContent value="departments">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 font-playfair">
                        <Building2 className="h-5 w-5 text-primary" />
                        Departments
                      </CardTitle>
                      <CardDescription>Manage organizational departments</CardDescription>
                    </div>
                    <Button onClick={() => openDialog("department")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Department
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterData(departments, searchTerm).map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell>{dept.id}</TableCell>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openDialog("department", dept)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete("department", dept.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 font-playfair">
                        <Users className="h-5 w-5 text-primary" />
                        Members
                      </CardTitle>
                      <CardDescription>Manage organization members</CardDescription>
                    </div>
                    <Button onClick={() => openDialog("member")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>University ID</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterData(members, searchTerm).map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>{member.id}</TableCell>
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.uni_id}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>{member.phone_number}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openDialog("member", member)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete("member", member.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 font-playfair">
                        <Calendar className="h-5 w-5 text-primary" />
                        Events
                      </CardTitle>
                      <CardDescription>Manage events and activities</CardDescription>
                    </div>
                    <Button onClick={() => openDialog("event")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Event
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterData(events, searchTerm).map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>{event.id}</TableCell>
                          <TableCell className="font-medium">{event.name}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openDialog("event", event)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete("event", event.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 font-playfair">
                        <Activity className="h-5 w-5 text-primary" />
                        Actions
                      </CardTitle>
                      <CardDescription>Manage scoring actions and point values</CardDescription>
                    </div>
                    <Button onClick={() => openDialog("action")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Action
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterData(actions, searchTerm).map((action) => (
                        <TableRow key={action.id}>
                          <TableCell>{action.id}</TableCell>
                          <TableCell className="font-medium">{action.name}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {action.points} pts
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => openDialog("action", action)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete("action", action.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Dialog for Add/Edit */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-playfair">
              {editingItem ? "Edit" : "Add"} {dialogType.charAt(0).toUpperCase() + dialogType.slice(1)}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the" : "Create a new"} {dialogType} entry.
            </DialogDescription>
          </DialogHeader>
          {renderDialogContent()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editingItem ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
