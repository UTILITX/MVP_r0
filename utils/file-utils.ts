// Utility functions for handling file operations

export function hasFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false

  // Check if any of the items are files
  for (let i = 0; i < dataTransfer.items.length; i++) {
    if (dataTransfer.items[i].kind === "file") {
      return true
    }
  }

  return false
}

export function extractFiles(dataTransfer: DataTransfer): File[] {
  const files: File[] = []

  if (!dataTransfer) return files

  // Extract files from DataTransfer
  for (let i = 0; i < dataTransfer.files.length; i++) {
    const file = dataTransfer.files[i]
    if (file) {
      files.push(file)
    }
  }

  return files
}
