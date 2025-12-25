<?php
if(isset($_FILES['foto'])){
    $errors = [];
    $file_name = $_FILES['foto']['name'];
    $file_tmp = $_FILES['foto']['tmp_name'];
    $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
    $allowed = ['jpg','jpeg','png','gif'];

    if(!in_array($file_ext, $allowed)){
        echo "Format file tidak diperbolehkan!";
        exit;
    }

    $new_name = uniqid() . "." . $file_ext;
    $upload_dir = "uploads/"; // pastikan folder ini ada dan writable
    if(move_uploaded_file($file_tmp, $upload_dir.$new_name)){
        $url = "https://www.stevemc.my.id/".$upload_dir.$new_name;
        echo "Upload berhasil!<br>";
        echo "Link foto: <a href='$url'>$url</a>";
    } else {
        echo "Gagal upload foto!";
    }
}
?>