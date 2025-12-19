import { storage } from './firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll
} from 'firebase/storage';

// Upload a room photo
export async function uploadRoomPhoto(
  roomId: string,
  file: File
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `rooms/${roomId}/photos/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading room photo:', error);
    return null;
  }
}

// Upload a room video
export async function uploadRoomVideo(
  roomId: string,
  file: File
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `rooms/${roomId}/videos/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading room video:', error);
    return null;
  }
}

// Upload a 3D tour (e.g., Matterport embed URL or file)
export async function uploadRoom3DTour(
  roomId: string,
  file: File
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `rooms/${roomId}/tours3d/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return downloadURL;
  } catch (error) {
    console.error('Error uploading 3D tour:', error);
    return null;
  }
}

// Delete a file from storage
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

// Get all photos for a room
export async function getRoomPhotos(roomId: string): Promise<string[]> {
  try {
    const listRef = ref(storage, `rooms/${roomId}/photos`);
    const result = await listAll(listRef);

    const urls = await Promise.all(
      result.items.map(item => getDownloadURL(item))
    );

    return urls;
  } catch (error) {
    console.error('Error getting room photos:', error);
    return [];
  }
}

// Get all videos for a room
export async function getRoomVideos(roomId: string): Promise<string[]> {
  try {
    const listRef = ref(storage, `rooms/${roomId}/videos`);
    const result = await listAll(listRef);

    const urls = await Promise.all(
      result.items.map(item => getDownloadURL(item))
    );

    return urls;
  } catch (error) {
    console.error('Error getting room videos:', error);
    return [];
  }
}

// Get all 3D tours for a room
export async function getRoom3DTours(roomId: string): Promise<string[]> {
  try {
    const listRef = ref(storage, `rooms/${roomId}/tours3d`);
    const result = await listAll(listRef);

    const urls = await Promise.all(
      result.items.map(item => getDownloadURL(item))
    );

    return urls;
  } catch (error) {
    console.error('Error getting 3D tours:', error);
    return [];
  }
}
