"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ChevronsUpDown, Plus, UserPlus } from "lucide-react"

// Mock data for existing members
const MOCK_MEMBERS = [
  { id: 1, name: "John Doe", email: "john@example.com", phone_number: "123-456-7890", uni_id: "UNI001" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", phone_number: "123-456-7891", uni_id: "UNI002" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", phone_number: "123-456-7892", uni_id: "UNI003" },
  { id: 4, name: "Alice Brown", email: "alice@example.com", phone_number: "123-456-7893", uni_id: "UNI004" },
  { id: 5, name: "Charlie Wilson", email: "charlie@example.com", phone_number: "123-456-7894", uni_id: "UNI005" },
  { id: 6, name: "Diana Davis", email: "diana@example.com", phone_number: "123-456-7895", uni_id: "UNI006" },
  { id: 7, name: "Eva Martinez", email: "eva@example.com", phone_number: "123-456-7896", uni_id: "UNI007" },
  { id: 8, name: "Frank Garcia", email: "frank@example.com", phone_number: "123-456-7897", uni_id: "UNI008" },
]

interface Member {
  id: number
  name: string
  email: string
  phone_number: string
  uni_id: string
}

interface MemberSelectorProps {
  onMemberSelect: (member: Member) => void
  participationTypes: string[]
  eventDate: string
}

export function MemberSelector({ onMemberSelect, participationTypes, eventDate }: MemberSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [showAddNew, setShowAddNew] = useState(false)
  const [newMemberForm, setNewMemberForm] = useState({
    name: "",
    email: "",
    phone_number: "",
    uni_id: "",
    participation_type: "",
  })

  const filteredMembers = MOCK_MEMBERS.filter(
    (member) =>
      member.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      member.email.toLowerCase().includes(searchValue.toLowerCase()) ||
      member.uni_id.toLowerCase().includes(searchValue.toLowerCase()),
  )

  const handleSelectExistingMember = (member: Member) => {
    onMemberSelect({
      ...member,
      participation_type: "",
      attendance_date: eventDate,
    })
    setOpen(false)
    setSearchValue("")
  }

  const handleAddNewMember = () => {
    if (newMemberForm.name && newMemberForm.email && newMemberForm.uni_id && newMemberForm.participation_type) {
      onMemberSelect({
        id: Date.now(), // Temporary ID
        name: newMemberForm.name,
        email: newMemberForm.email,
        phone_number: newMemberForm.phone_number,
        uni_id: newMemberForm.uni_id,
        participation_type: newMemberForm.participation_type,
        attendance_date: eventDate,
      })
      setNewMemberForm({
        name: "",
        email: "",
        phone_number: "",
        uni_id: "",
        participation_type: "",
      })
      setShowAddNew(false)
      setOpen(false)
      setSearchValue("")
    }
  }

  const resetForm = () => {
    setShowAddNew(false)
    setNewMemberForm({
      name: "",
      email: "",
      phone_number: "",
      uni_id: "",
      participation_type: "",
    })
    setSearchValue("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="justify-between bg-transparent">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Member
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search members..." value={searchValue} onValueChange={setSearchValue} />
          <CommandList>
            {!showAddNew && (
              <>
                <CommandEmpty>
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">No members found</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddNew(true)} className="text-primary">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Member
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {filteredMembers.map((member) => (
                    <CommandItem
                      key={member.id}
                      value={member.name}
                      onSelect={() => handleSelectExistingMember(member)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{member.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {member.email} • {member.uni_id}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                  {filteredMembers.length > 0 && (
                    <CommandItem onSelect={() => setShowAddNew(true)} className="cursor-pointer border-t">
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Member
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}

            {showAddNew && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Add New Member</h4>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    Back
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name *</Label>
                    <Input
                      placeholder="Full name"
                      value={newMemberForm.name}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Email *</Label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={newMemberForm.email}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">University ID *</Label>
                    <Input
                      placeholder="UNI123"
                      value={newMemberForm.uni_id}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, uni_id: e.target.value })}
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input
                      placeholder="123-456-7890"
                      value={newMemberForm.phone_number}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, phone_number: e.target.value })}
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Participation Type *</Label>
                    <Select
                      value={newMemberForm.participation_type}
                      onValueChange={(value) => setNewMemberForm({ ...newMemberForm, participation_type: value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {participationTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleAddNewMember}
                  className="w-full h-8"
                  disabled={
                    !newMemberForm.name ||
                    !newMemberForm.email ||
                    !newMemberForm.uni_id ||
                    !newMemberForm.participation_type
                  }
                >
                  Add Member
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
