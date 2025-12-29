import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail, Save, Eye, Code, Info } from "lucide-react";

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  body_html: string;
  available_placeholders: string[];
  updated_at: string;
}

export function AdminEmailTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, subject, body_html }: { id: string; subject: string; body_html: string }) => {
      const { error } = await supabase
        .from("email_templates")
        .update({ subject, body_html })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template saved",
        description: "Your email template has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedSubject(template.subject);
    setEditedBody(template.body_html);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({
      id: selectedTemplate.id,
      subject: editedSubject,
      body_html: editedBody,
    });
  };

  const getPreviewHtml = () => {
    // Replace placeholders with sample data for preview
    const sampleData: Record<string, string> = {
      requester_name: "Jane",
      helper_name: "Sarah",
      requester_location: "San Francisco, USA",
      request_message: "I'd love to connect about your experience in product design...",
      profile_link: "#",
      matches_link: "#",
      requests_link: "#",
    };

    let preview = editedBody;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, "g"), value);
    });
    return preview;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Email Templates</h2>
          <p className="text-sm text-muted-foreground">
            Customize notification emails with your branding
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="space-y-3">
          {templates?.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-card ${
                selectedTemplate?.id === template.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleSelectTemplate(template)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-sm">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {template.subject}
                    </p>
                  </div>
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2">
          {!selectedTemplate ? (
            <Card className="h-full flex items-center justify-center bg-muted/30">
              <CardContent className="text-center py-16">
                <Mail className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Select a template to edit</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-xl">{selectedTemplate.name}</CardTitle>
                <CardDescription>
                  Template key: <code className="text-xs bg-muted px-1 py-0.5 rounded">{selectedTemplate.template_key}</code>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Available Placeholders */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="placeholders" className="border rounded-lg px-4">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Available Placeholders
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-wrap gap-2 pb-2">
                        {selectedTemplate.available_placeholders.map((placeholder) => (
                          <Badge
                            key={placeholder}
                            variant="secondary"
                            className="font-mono text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => {
                              navigator.clipboard.writeText(`{{${placeholder}}}`);
                              toast({
                                title: "Copied!",
                                description: `{{${placeholder}}} copied to clipboard`,
                              });
                            }}
                          >
                            {`{{${placeholder}}}`}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Click a placeholder to copy it. Paste it in the subject or body.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    placeholder="Enter email subject..."
                  />
                </div>

                {/* Body HTML */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="body">Email Body (HTML)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewOpen(true)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                  </div>
                  <Textarea
                    id="body"
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    className="min-h-[300px] font-mono text-xs"
                    placeholder="Enter HTML email body..."
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Code className="w-3 h-3" />
                    Use inline CSS for email styling. Most email clients have limited CSS support.
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Template
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Email Preview</DialogTitle>
            <DialogDescription>
              Subject: {editedSubject.replace(/{{(\w+)}}/g, (_, key) => {
                const sampleData: Record<string, string> = {
                  requester_name: "Jane",
                  helper_name: "Sarah",
                };
                return sampleData[key] || `{{${key}}}`;
              })}
            </DialogDescription>
          </DialogHeader>
          <div 
            className="border rounded-lg overflow-hidden"
            dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
