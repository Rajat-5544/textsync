"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import QuillCursors from "quill-cursors";
import { io } from "socket.io-client";

Quill.register("modules/cursors", QuillCursors);

const SAVE_INTERVAL_MS = 2000;
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
];

export default function DocumentEditor() {
  const { id: documentId } = useParams(); // Get document ID from the URL
  const router = useRouter();
  const [socket, setSocket] = useState<any>(null);
  const [quill, setQuill] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false); // Track if the document is loaded
  const [userName, setUserName] = useState<string | null>("");
  const [activeUsers, setActiveUsers] = useState<string[]>([]);

  useEffect(() => {
    const name = localStorage.getItem("userName");
    if (!name) {
      router.push("/name"); // Redirect to name input page if no name is found
    } else {
      setUserName(name);
    }
  }, [router]);

  // Connect to the socket server once
  useEffect(() => {
    const s = io("http://localhost:3001"); // Connect to the server
    setSocket(s);

    return () => {
      s.disconnect(); // Clean up the connection when the component is unmounted
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // Initialize the Quill editor once
  useEffect(() => {
    if (!documentId) return; // Ensure documentId is available before initializing Quill

    const wrapper = document.querySelector("#quill-editor"); // Get the container for Quill editor
    if (wrapper == null) return;

    wrapper.innerHTML = ""; // Clear any previous content
    const editor = document.createElement("div");
    wrapper.append(editor);

    const q = new Quill(editor, {
      theme: "snow",
      modules: { 
        toolbar: TOOLBAR_OPTIONS,
        cursors: true,
      },
    });
    q.disable(); // Disable editing until the document is loaded
    q.setText("Loading...");
    setQuill(q);

    return () => {
      q.off("text-change"); // Cleanup Quill instance on unmount
    };
  }, [documentId]); // Run only when documentId changes

  // Fetch and load the document content
  useEffect(() => {
    if (!socket || !quill || isLoaded || !documentId) return; // Avoid unnecessary calls

    socket.once("load-document", (document: any) => {
      quill.setContents(document); // Load the document content
      quill.enable();
      setIsLoaded(true); // Mark as loaded
      socket.emit("join-document", { documentId, userName });
    });

    socket.on("update-active-users", (users: string[]) => {
      setActiveUsers(users);
    });

    socket.emit("get-document", documentId); // Fetch the document by ID
  }, [socket, quill, documentId, isLoaded]); // Only run when socket, quill, or documentId changes

  // Save the document periodically
  useEffect(() => {
    if (!socket || !quill || !isLoaded) return; // Only start saving when document is loaded

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents()); // Save the document periodically
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval); // Cleanup interval on unmount
    };
  }, [socket, quill, isLoaded]); // Ensure saving happens after document is loaded

  // Handle receiving changes from other users
  useEffect(() => {
    if (!socket || !quill || !isLoaded) return; // Ensure document is loaded

    const handler = (delta: any) => {
      quill.updateContents(delta); // Apply changes from other users
    };
    socket.on("receive-changes", handler);

    return () => {
      socket.off("receive-changes", handler); // Clean up the socket listener
    };
  }, [socket, quill, isLoaded]); // Only listen after document is loaded

  // Handle sending changes to the server
  useEffect(() => {
    if (!socket || !quill || !isLoaded) return; // Only listen after document is loaded

    const handler = (delta: any, oldDelta: any, source: any) => {
      if (source !== "user") return; // Only send changes made by the user
      socket.emit("send-changes", delta); // Emit changes to the server
    };
    quill.on("text-change", handler);

    return () => {
      quill.off("text-change", handler); // Clean up the text-change listener
    };
  }, [socket, quill, isLoaded]); // Only listen after document is loaded

  useEffect(() => {
    if (!quill || !socket) return;
  
    const handleSelectionChange = (range: any) => {
      if (range) {
        socket.emit("send-cursor", {
          documentId,
          userId: userName || "Unknown", // Use the actual user name or ID
          cursorPosition: range.index, // The index of the cursor position
        });
      }
    };
  
    quill.on("selection-change", handleSelectionChange);
  
    return () => {
      quill.off("selection-change", handleSelectionChange);
    };
  }, [quill, socket, documentId, userName]);
  
  useEffect(() => {
    if (!socket || !quill) return;
  
    const cursors = quill.getModule("cursors");

    const handleReceiveCursor = ({ userId, cursorPosition }: any) => {
      // Create the cursor instead of setting it
      const color = "blue"; // Customize the cursor color
      const name = userId || "Unknown User"; // Fallback name if userId is unavailable
      const cursor = cursors.createCursor(userId, name, color);
      
      // Adjust the cursor position by adding 1 to the index to fix the offset
      const adjustedPosition = cursorPosition + 0;

      // Set the cursor's position (range) at the adjusted index
      cursor.range = { index: adjustedPosition, length: 0 }; // Set length to 0 for just a cursor marker
    };
  
    socket.on("receive-cursor", handleReceiveCursor);
  
    return () => {
      socket.off("receive-cursor", handleReceiveCursor);
    };
  }, [socket, quill]);  

  return (
    <div className="container">
      <h2 className="text-xl font-bold mb-4">Welcome, {userName}</h2>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Active Users:</h3>
        <ul>
          {activeUsers.map((user, index) => (
            <li key={index} className="text-sm">{user}</li>
          ))}
        </ul>
      </div>
      <div id="quill-editor"></div>
    </div>
  );
}