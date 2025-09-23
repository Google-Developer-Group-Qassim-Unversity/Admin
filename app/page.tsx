import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Database, Home, Edit } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <nav className="bg-white/80 border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary via-secondary to-accent rounded-lg flex items-center justify-center">
                <Home className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-heading font-bold text-foreground">Score Leaderboard Admin</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/department-events">
                <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                  Add Events
                </Button>
              </Link>
              <Link href="/edit-events">
                <Button variant="ghost" size="sm" className="text-secondary hover:bg-secondary/10">
                  Edit Events
                </Button>
              </Link>
              <Link href="/data-management">
                <Button variant="ghost" size="sm" className="text-accent hover:bg-accent/10">
                  Data
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-heading font-bold text-foreground mb-4">Welcome Back!</h2>
          <p className="text-lg text-muted-foreground">Choose what you'd like to manage today</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="hover:shadow-xl transition-all duration-300 border-2 border-primary/20 bg-white">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="font-heading text-xl text-primary">Add New Event</CardTitle>
              <CardDescription>Create new events with guided wizard</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/department-events">
                <Button className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90">
                  + Add New Event
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 border-2 border-secondary/20 bg-white">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Edit className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="font-heading text-xl text-secondary">Edit Events</CardTitle>
              <CardDescription>Modify and manage existing events</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/edit-events">
                <Button className="w-full h-12 text-base font-medium bg-secondary hover:bg-secondary/90">
                  Edit Existing Events
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl opacity-50 cursor-not-allowed transition-all duration-300 border-2 border-accent/20 bg-white md:col-span-2 lg:col-span-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-accent to-accent/80 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Database className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="font-heading text-xl text-accent">Data Management</CardTitle>
              <CardDescription>Manage members, departments, and more</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <Link href="/data-management">
                <Button className="w-full h-12  text-base font-medium bg-accent hover:bg-accent/90">
                  + Manage Data
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
