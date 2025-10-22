import { useState, useRef } from "react";
import { Upload, X, File, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { validateFile, scanFileContent, generateSecureFileName, DEFAULT_FILE_CONFIG } from "@/lib/fileUpload";
import { logSecurityEvent, sanitizeError } from "@/lib/security";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SecureFileUploadProps {
  onUploadComplete?: (fileUrl: string) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSize?: number;
}

export const SecureFileUpload = ({ 
  onUploadComplete, 
  maxFiles = 5,
  acceptedTypes,
  maxSize = 10 * 1024 * 1024 // 10MB
}: SecureFileUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const config = {
    ...DEFAULT_FILE_CONFIG,
    maxFiles,
    maxSize,
    allowedTypes: acceptedTypes || DEFAULT_FILE_CONFIG.allowedTypes
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || !user) return;

    const newFiles = Array.from(selectedFiles);
    const validationErrors: string[] = [];
    const validFiles: File[] = [];

    // Validate each file
    for (const file of newFiles) {
      const validation = validateFile(file, config);
      if (!validation.valid) {
        validationErrors.push(`${file.name}: ${validation.error}`);
        continue;
      }

      // Scan file content for malicious patterns
      const isSafe = await scanFileContent(file);
      if (!isSafe) {
        validationErrors.push(`${file.name}: Potentially malicious content detected`);
        continue;
      }

      validFiles.push(validation.sanitizedFile!);
    }

    // Check total file count
    if (files.length + validFiles.length > config.maxFiles) {
      validationErrors.push(`Maximum ${config.maxFiles} files allowed`);
    }

    setErrors(validationErrors);
    setFiles(prev => [...prev, ...validFiles]);

    // Log file validation events
    await logSecurityEvent('file_validation', {
      total_files: newFiles.length,
      valid_files: validFiles.length,
      errors: validationErrors.length
    }, user.id);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!user || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const secureFileName = generateSecureFileName(file.name, user.id);
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('secure-uploads')
          .upload(secureFileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('secure-uploads')
          .getPublicUrl(secureFileName);

        if (!urlData.publicUrl) {
          throw new Error(`Failed to get URL for ${file.name}`);
        }

        // Store file metadata in database
        const { error: dbError } = await supabase
          .from('file_uploads')
          .insert({
            user_id: user.id,
            original_name: file.name,
            secure_name: secureFileName,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            mime_type: file.type,
            is_verified: true,
            scan_status: 'clean'
          });

        if (dbError) {
          console.error('Failed to store file metadata:', dbError);
        }

        uploadedUrls.push(urlData.publicUrl);
        setUploadProgress(((i + 1) / files.length) * 100);

        // Log successful upload
        await logSecurityEvent('file_uploaded', {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          secure_name: secureFileName
        }, user.id);
      }

      toast({
        title: "Upload Successful",
        description: `${files.length} file(s) uploaded successfully`,
      });

      // Call completion callback
      if (onUploadComplete && uploadedUrls.length > 0) {
        onUploadComplete(uploadedUrls[0]); // Return first URL for single file usage
      }

      // Reset state
      setFiles([]);
      setErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      // Log upload error
      await logSecurityEvent('file_upload_failed', {
        error: error.message,
        file_count: files.length
      }, user.id);

      toast({
        title: "Upload Failed",
        description: sanitizeError(error) || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Upload Area */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                Click to upload files or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                Max {Math.round(config.maxSize / 1024 / 1024)}MB per file, {config.maxFiles} files max
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept={config.allowedTypes.join(',')}
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>

            {/* Error Messages */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Selected Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Selected Files:</h4>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <File className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({Math.round(file.size / 1024)}KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading files...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Upload Button */}
            {files.length > 0 && !uploading && (
              <Button onClick={uploadFiles} className="w-full">
                Upload {files.length} file{files.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
